import { Settings } from "../models/Management.js";
import User from "../models/User.js";
import { ApiError, ApiResponse, asyncHandler } from "../utils/ApiHelpers.js";

export const getSettings = asyncHandler(async (req, res) => {
  let settings = await Settings.findOne({ ownerId: req.ownerId });
  if (!settings) settings = await Settings.create({ ownerId: req.ownerId });
  return res.json(new ApiResponse(200, settings));
});

export const updateSettings = asyncHandler(async (req, res) => {
  const settings = await Settings.findOneAndUpdate(
    { ownerId: req.ownerId },
    { $set: req.body },
    { new: true, upsert: true }
  );
  return res.json(new ApiResponse(200, settings, "Settings updated"));
});

export const updateBranding = asyncHandler(async (req, res) => {
  const { instituteName, primaryColor, logo, domain } = req.body;

  const [settings] = await Promise.all([
    Settings.findOneAndUpdate(
      { ownerId: req.ownerId },
      { $set: { "institute.name": instituteName, "institute.logo": logo, "branding.primaryColor": primaryColor, "branding.domain": domain } },
      { new: true, upsert: true }
    ),
    User.findByIdAndUpdate(req.ownerId, {
      "branding.instituteName": instituteName,
      "branding.logo": logo,
      "branding.primaryColor": primaryColor,
      "branding.domain": domain,
    }),
  ]);

  return res.json(new ApiResponse(200, settings, "Branding updated"));
});
