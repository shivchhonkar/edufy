const fs = require('fs');
const path = require('path');

// Create upload directories
const uploadDir = path.join(__dirname, 'public', 'uploads', 'homework');

try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('✅ Created upload directory:', uploadDir);
  } else {
    console.log('✅ Upload directory already exists:', uploadDir);
  }

  // Create .gitkeep to track the directory
  const gitkeepPath = path.join(uploadDir, '.gitkeep');
  if (!fs.existsSync(gitkeepPath)) {
    fs.writeFileSync(gitkeepPath, '');
    console.log('✅ Created .gitkeep file');
  }

  console.log('\n🎉 Upload directory setup complete!');
  console.log('You can now upload files through the homework page.');
} catch (error) {
  console.error('❌ Error setting up upload directory:', error);
  process.exit(1);
}


























































