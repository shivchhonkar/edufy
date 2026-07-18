import type { OrganizationSubscription, OrganizationWithSubscription } from '@edulakhya/types';
import { createControlPool } from '@/lib/platform-db-config';

const ORGANIZATION_CONTACT_JOINS = `
  LEFT JOIN organization_branding ob ON ob.organization_id = o.id
`;

const ORGANIZATION_CONTACT_FIELDS = `
  ob.support_email,
  ob.support_phone,
  (
    SELECT full_name FROM organization_users ou
    WHERE ou.organization_id = o.id AND ou.is_active = true
    ORDER BY CASE ou.role WHEN 'org_owner' THEN 0 WHEN 'org_admin' THEN 1 ELSE 2 END, ou.id
    LIMIT 1
  ) AS contact_name,
  (
    SELECT email FROM organization_users ou
    WHERE ou.organization_id = o.id AND ou.is_active = true
    ORDER BY CASE ou.role WHEN 'org_owner' THEN 0 WHEN 'org_admin' THEN 1 ELSE 2 END, ou.id
    LIMIT 1
  ) AS contact_email
`;

const ORGANIZATION_BASE_FIELDS = `
  o.id,
  o.slug,
  o.name,
  o.type,
  o.school_code,
  COALESCE(o.is_active, true) AS is_active,
  o.max_schools,
  o.subscription_plan,
  o.created_at,
  o.updated_at,
  (SELECT COUNT(*)::int FROM tenants t WHERE t.organization_id = o.id AND t.is_active = true) AS school_count,
  (
    SELECT row_to_json(s.*)
    FROM organization_subscriptions s
    WHERE s.organization_id = o.id
    ORDER BY s.valid_until DESC NULLS LAST, s.updated_at DESC
    LIMIT 1
  ) AS subscription,
  ${ORGANIZATION_CONTACT_FIELDS}
`;

export type SubscriptionOverview = {
  totals: {
    organizations: number;
    schools: number;
    active_subscriptions: number;
    expiring_soon: number;
  };
  recent: OrganizationWithSubscription[];
};

export async function getSubscriptionOverview(): Promise<SubscriptionOverview> {
  const pool = createControlPool();
  try {
    const [totalsRes, recentRes] = await Promise.all([
      pool.query<{
        organizations: string;
        schools: string;
        active_subscriptions: string;
        expiring_soon: string;
      }>(`
        SELECT
          (SELECT COUNT(*)::text FROM organizations WHERE is_active = true) AS organizations,
          (SELECT COUNT(*)::text FROM tenants WHERE is_active = true) AS schools,
          (SELECT COUNT(*)::text FROM organization_subscriptions WHERE status = 'active') AS active_subscriptions,
          (SELECT COUNT(*)::text FROM organization_subscriptions
           WHERE status = 'active'
             AND valid_until IS NOT NULL
             AND valid_until <= CURRENT_DATE + INTERVAL '30 days') AS expiring_soon
      `),
      pool.query(`
        SELECT
          ${ORGANIZATION_BASE_FIELDS}
        FROM organizations o
        ${ORGANIZATION_CONTACT_JOINS}
        ORDER BY o.updated_at DESC
        LIMIT 8
      `),
    ]);

    const totals = totalsRes.rows[0];
    return {
      totals: {
        organizations: parseInt(totals.organizations, 10) || 0,
        schools: parseInt(totals.schools, 10) || 0,
        active_subscriptions: parseInt(totals.active_subscriptions, 10) || 0,
        expiring_soon: parseInt(totals.expiring_soon, 10) || 0,
      },
      recent: recentRes.rows as OrganizationWithSubscription[],
    };
  } finally {
    await pool.end();
  }
}

export async function listOrganizationsWithSubscriptions(): Promise<OrganizationWithSubscription[]> {
  const pool = createControlPool();
  try {
    const result = await pool.query(`
      SELECT
        ${ORGANIZATION_BASE_FIELDS}
      FROM organizations o
      ${ORGANIZATION_CONTACT_JOINS}
      ORDER BY o.name ASC
    `);
    return result.rows as OrganizationWithSubscription[];
  } finally {
    await pool.end();
  }
}

export async function getOrganizationWithSubscription(
  organizationId: number,
): Promise<(OrganizationWithSubscription & { schools: Array<{ id: number; name: string; slug: string; is_active: boolean }> }) | null> {
  const pool = createControlPool();
  try {
    const orgRes = await pool.query(
      `
      SELECT
        ${ORGANIZATION_BASE_FIELDS}
      FROM organizations o
      ${ORGANIZATION_CONTACT_JOINS}
      WHERE o.id = $1
      `,
      [organizationId],
    );

    const org = orgRes.rows[0] as OrganizationWithSubscription | undefined;
    if (!org) return null;

    const schoolsRes = await pool.query(
      `SELECT id, name, slug, is_active FROM tenants WHERE organization_id = $1 ORDER BY is_primary DESC, name ASC`,
      [organizationId],
    );

    return { ...org, schools: schoolsRes.rows };
  } finally {
    await pool.end();
  }
}

export async function listSubscriptions(): Promise<
  Array<OrganizationSubscription & { organization_name: string; organization_slug: string }>
> {
  const pool = createControlPool();
  try {
    const result = await pool.query(`
      SELECT s.*, o.name AS organization_name, o.slug AS organization_slug
      FROM organization_subscriptions s
      INNER JOIN organizations o ON o.id = s.organization_id
      ORDER BY s.updated_at DESC, s.id DESC
    `);
    return result.rows;
  } finally {
    await pool.end();
  }
}

export type CreateSubscriptionInput = {
  organization_id: number;
  plan: string;
  status?: string;
  school_count_limit?: number | null;
  student_count_limit?: number | null;
  billing_cycle?: string | null;
  valid_from?: string | null;
  valid_until?: string | null;
};

export async function createSubscription(
  input: CreateSubscriptionInput,
): Promise<OrganizationSubscription> {
  const pool = createControlPool();
  try {
    const result = await pool.query<OrganizationSubscription>(
      `
      INSERT INTO organization_subscriptions (
        organization_id, plan, status, school_count_limit, student_count_limit,
        billing_cycle, valid_from, valid_until, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
      RETURNING *
      `,
      [
        input.organization_id,
        input.plan,
        input.status ?? 'active',
        input.school_count_limit ?? null,
        input.student_count_limit ?? null,
        input.billing_cycle ?? 'annual',
        input.valid_from ?? null,
        input.valid_until ?? null,
      ],
    );

    await pool.query(
      `UPDATE organizations SET subscription_plan = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [input.plan, input.organization_id],
    );

    return result.rows[0];
  } finally {
    await pool.end();
  }
}

export type UpdateSubscriptionInput = Partial<
  Omit<CreateSubscriptionInput, 'organization_id'>
>;

export async function updateSubscription(
  subscriptionId: number,
  input: UpdateSubscriptionInput,
): Promise<OrganizationSubscription | null> {
  const pool = createControlPool();
  try {
    const existing = await pool.query<OrganizationSubscription>(
      'SELECT * FROM organization_subscriptions WHERE id = $1',
      [subscriptionId],
    );
    const current = existing.rows[0];
    if (!current) return null;

    const result = await pool.query<OrganizationSubscription>(
      `
      UPDATE organization_subscriptions SET
        plan = COALESCE($2, plan),
        status = COALESCE($3, status),
        school_count_limit = COALESCE($4, school_count_limit),
        student_count_limit = COALESCE($5, student_count_limit),
        billing_cycle = COALESCE($6, billing_cycle),
        valid_from = COALESCE($7, valid_from),
        valid_until = COALESCE($8, valid_until),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
      `,
      [
        subscriptionId,
        input.plan ?? null,
        input.status ?? null,
        input.school_count_limit ?? null,
        input.student_count_limit ?? null,
        input.billing_cycle ?? null,
        input.valid_from ?? null,
        input.valid_until ?? null,
      ],
    );

    if (input.plan) {
      await pool.query(
        `UPDATE organizations SET subscription_plan = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [input.plan, current.organization_id],
      );
    }

    return result.rows[0] ?? null;
  } finally {
    await pool.end();
  }
}

export async function setOrganizationActive(
  organizationId: number,
  isActive: boolean,
): Promise<void> {
  const pool = createControlPool();
  try {
    await pool.query(
      `
      UPDATE organizations SET
        is_active = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      `,
      [organizationId, isActive],
    );
  } finally {
    await pool.end();
  }
}

export async function updateOrganizationLimits(
  organizationId: number,
  data: { max_schools?: number | null; is_active?: boolean },
): Promise<void> {
  const pool = createControlPool();
  try {
    await pool.query(
      `
      UPDATE organizations SET
        max_schools = COALESCE($2, max_schools),
        is_active = COALESCE($3, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      `,
      [organizationId, data.max_schools ?? null, data.is_active ?? null],
    );
  } finally {
    await pool.end();
  }
}
