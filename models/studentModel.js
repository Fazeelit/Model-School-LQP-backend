import mongoose from "mongoose";

const feeRecordSchema = new mongoose.Schema(
  {
    month: {
      type: String,
      trim: true,
    },
    year: {
      type: Number,
    },
    amount: {
      type: Number,
      default: 0,
      min: 0,
    },
    registrationFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    monthlyFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["Pending", "Paid", "Unpaid"],
      default: "Pending",
    },
    paidDate: {
      type: Date,
      default: null,
    },
  },
  { _id: false }
);

const feeSchema = new mongoose.Schema(
  {
    registrationFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    monthlyFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    monthlyFeeDate: {
      type: Date,
      default: null,
    },
    mode: {
      type: String,
      enum: ["Monthly", "Annual"],
      default: "Monthly",
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    annualDiscount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
);

const studentSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    gender: {
      type: String,
      enum: ["Male", "Female"],
      default: "Male",
    },
    dob: {
      type: Date,
      default: null,
    },
    cnicBForm: {
      type: String,
      trim: true,
      default: "",
    },
    address: {
      type: String,
      trim: true,
      default: "",
    },
    fatherName: {
      type: String,
      required: true,
      trim: true,
    },
    fatherCNIC: {
      type: String,
      trim: true,
      default: "",
    },
    fatherPhone: {
      type: String,
      trim: true,
      default: "",
    },
    whatsappNumber: {
      type: String,
      trim: true,
      default: "",
    },
    registrationNumber: {
      type: String,
      trim: true,
    },
    classRoleNumber: {
      type: String,
      required: true,
      trim: true,
    },
    enrollmentClass: {
      type: String,
      required: true,
      trim: true,
    },
    className: {
      type: String,
      trim: true,
      default: "",
    },
    section: {
      type: String,
      trim: true,
      default: "",
    },
    admissionDate: {
      type: Date,
      default: null,
    },
    group: {
      type: String,
      enum: [
        "",
        "Science Group With Biology",
        "Science Group With Computer Sc.",
        "Arts Group",
      ],
      trim: true,
      default: "",
    },
    previousClass: {
      type: String,
      trim: true,
      default: "",
    },
    previousSchool: {
      type: String,
      trim: true,
      default: "",
    },
    enrollmentType: {
      type: String,
      enum: ["Private", "PEF"],
      default: "Private",
    },
    fee: {
      type: feeSchema,
      required: false,
      default: undefined,
    },
    feeRecords: {
      type: [feeRecordSchema],
      default: [],
    },
    photo: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
  },
  { timestamps: true }
);

studentSchema.index(
  { registrationNumber: 1 },
  { unique: true, sparse: true, name: "registrationNumber_1_sparse" }
);
studentSchema.index({ status: 1, enrollmentClass: 1, createdAt: -1 });
studentSchema.index({ createdAt: -1 });

const Student =
  mongoose.models.Student || mongoose.model("Student", studentSchema);

export default Student;
