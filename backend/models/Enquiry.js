const mongoose = require("mongoose");

const enquirySchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  message: { type: String, required: true },
  status: { type: String, enum: ["pending", "contacted", "closed"], default: "pending" }
}, { timestamps: true });

module.exports = mongoose.models.Enquiry || mongoose.model("Enquiry", enquirySchema);
