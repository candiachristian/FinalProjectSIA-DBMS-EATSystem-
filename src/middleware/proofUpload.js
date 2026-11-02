'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const uploadDirectory = path.resolve(__dirname, '../../public/uploads/proofs');
fs.mkdirSync(uploadDirectory, { recursive: true });

const extensionsByMimeType = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
};

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadDirectory),
  filename: (_req, file, callback) => {
    const extension = extensionsByMimeType[file.mimetype];
    const fileName = `${Date.now()}-${crypto.randomBytes(12).toString('hex')}.${extension}`;
    callback(null, fileName);
  },
});

const uploadOneProof = multer({
  storage,
  limits: { fileSize: 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!extensionsByMimeType[file.mimetype]) {
      return callback(new Error('Proof must be a JPEG, PNG, GIF, or WEBP image.'));
    }
    callback(null, true);
  },
}).single('proof');

module.exports = (req, res, next) => {
  uploadOneProof(req, res, (error) => {
    if (error) {
      const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      return res.status(status).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
    next();
  });
};
