"use strict";

const express = require("express");
const router = express.Router();

const controller = require("../controllers/registration.controller");
const proofUpload = require("../middleware/proofUpload");

router.get(
  "/lookup/students",
  controller.lookupStudents
);

router.get(
  "/lookup/eligibility",
  controller.checkEligibility
);

router.get(
  "/lookup/events",
  controller.lookupEvents
);

router.get(
  "/",
  controller.list
);

router.post(
  "/",
  proofUpload,
  controller.create
);

router.put(
  "/:id/status",
  controller.updateStatus
);

router.delete(
  "/:id",
  controller.remove
);

module.exports = router;