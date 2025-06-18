const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { verifyToken, requireStaffOrAdmin } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads/images/medicines');
    
    // Ensure directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename: timestamp + original name
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    const fileName = file.fieldname + '-' + uniqueSuffix + fileExtension;
    cb(null, fileName);
  }
});

// File filter for images only
const fileFilter = (req, file, cb) => {
  // Check if file is an image
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

// Upload single image endpoint
router.post('/image', verifyToken, requireStaffOrAdmin, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    // Return the relative path that can be used in the frontend
    const imagePath = `/uploads/images/medicines/${req.file.filename}`;
    
    console.log('Image uploaded successfully:', {
      originalName: req.file.originalname,
      filename: req.file.filename,
      size: req.file.size,
      path: imagePath
    });

    res.json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        path: imagePath,
        url: `${req.protocol}://${req.get('host')}${imagePath}`
      }
    });

  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload image'
    });
  }
});

// Delete image endpoint
router.delete('/image/:filename', verifyToken, requireStaffOrAdmin, (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(__dirname, '../uploads/images/medicines', filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Image file not found'
      });
    }

    // Delete the file
    fs.unlinkSync(filePath);

    console.log('Image deleted successfully:', filename);

    res.json({
      success: true,
      message: 'Image deleted successfully'
    });

  } catch (error) {
    console.error('Image deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete image'
    });
  }
});

// Get list of uploaded images
router.get('/images', verifyToken, requireStaffOrAdmin, (req, res) => {
  try {
    const imagesPath = path.join(__dirname, '../uploads/images/medicines');
    
    if (!fs.existsSync(imagesPath)) {
      return res.json({
        success: true,
        data: []
      });
    }

    const files = fs.readdirSync(imagesPath);
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
    });

    const images = imageFiles.map(filename => {
      const filePath = path.join(imagesPath, filename);
      const stats = fs.statSync(filePath);
      
      return {
        filename,
        path: `/uploads/images/medicines/${filename}`,
        url: `${req.protocol}://${req.get('host')}/uploads/images/medicines/${filename}`,
        size: stats.size,
        uploadDate: stats.birthtime
      };
    });

    res.json({
      success: true,
      data: images
    });

  } catch (error) {
    console.error('Error fetching images:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch images'
    });
  }
});

module.exports = router; 