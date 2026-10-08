import mongoose from "mongoose";
import Student from "../models/studentModel.js";

const createStudent = async (req, res) => {
  try {
    const {
      fullName,
      gender,
      dob,
      cnicBForm,
      address,
      fatherName,
      fatherCNIC,
      fatherPhone,
      whatsappNumber,
      registrationNumber,
      classRoleNumber,
      enrollmentClass,
      className,
      section,
      admissionDate,
      group,
      previousClass,
      previousSchool,
      enrollmentType,
      fee,
      feeRecords,
      photo,
      status,
    } = req.body;

    const [enrollmentClassName = "", enrollmentSection = ""] = String(
      enrollmentClass || ""
    ).split(" - ");
    const normalizedClassName = String(className || enrollmentClassName).trim();
    const normalizedSection = String(section || enrollmentSection).trim();
    const normalizedEnrollmentClass = String(
      enrollmentClass || `${normalizedClassName} - ${normalizedSection}`
    ).trim();

    const requiredFields = [
      [fullName, "Full Name"],
      [fatherName, "Father's Name"],
      [classRoleNumber, "Class Role No."],
      [normalizedClassName, "Class & Section"],
    ];
    const missingField = requiredFields.find(([value]) => !String(value || "").trim());

    if (missingField) {
      return res.status(400).json({
        success: false,
        message: `${missingField[1]} is required`,
      });
    }

    const normalizedClassRoleNumber = String(classRoleNumber || "").trim();
    const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const normalizedClassPattern = `^${escapeRegExp(normalizedClassName)}\\s*$`;
    const normalizedSectionPattern = `^${escapeRegExp(normalizedSection)}\\s*$`;
    const normalizedEnrollmentPattern = `^${escapeRegExp(normalizedEnrollmentClass)}\\s*$`;
    const duplicateClassRoleNumber = await Student.findOne({
      classRoleNumber: {
        $regex: `^\\s*${escapeRegExp(normalizedClassRoleNumber)}\\s*$`,
        $options: "i",
      },
      $or: [
        {
          className: { $regex: normalizedClassPattern, $options: "i" },
          section: { $regex: normalizedSectionPattern, $options: "i" },
        },
        { enrollmentClass: { $regex: normalizedEnrollmentPattern, $options: "i" } },
      ],
    });
    if (duplicateClassRoleNumber) {
      return res.status(409).json({
        success: false,
        message: "This Class Role No. is already assigned in this class and section",
      });
    }

    const normalizedRegistrationNumber = registrationNumber?.trim() || undefined;
    const existingRegistration = normalizedRegistrationNumber
      ? await Student.findOne({ registrationNumber: normalizedRegistrationNumber })
      : null;
    if (existingRegistration) {
      return res.status(409).json({
        success: false,
        message: "Student with this registration number already exists",
      });
    }

    const normalizedEnrollmentType = enrollmentType === "PEF" ? "PEF" : "Private";
    const student = await Student.create({
      fullName: fullName.trim(),
      gender: gender || "Male",
      dob: dob || null,
      cnicBForm: cnicBForm?.trim() || "",
      address: address?.trim() || "",
      fatherName: fatherName.trim(),
      fatherCNIC: fatherCNIC?.trim() || "",
      fatherPhone: fatherPhone?.trim() || "",
      whatsappNumber: whatsappNumber?.trim() || "",
      registrationNumber: normalizedRegistrationNumber,
      classRoleNumber: normalizedClassRoleNumber,
      enrollmentClass: normalizedEnrollmentClass,
      className: normalizedClassName,
      section: normalizedSection,
      admissionDate: admissionDate || null,
      group: group?.trim() || "",
      previousClass: previousClass?.trim() || "",
      previousSchool: previousSchool?.trim() || "",
      enrollmentType: normalizedEnrollmentType,
      ...(normalizedEnrollmentType === "Private" ? { fee: {
        registrationFee: Number.isFinite(Number(fee?.registrationFee))
          ? Number(fee.registrationFee)
          : 0,
        monthlyFee: Number.isFinite(Number(fee?.monthlyFee))
          ? Number(fee.monthlyFee)
          : 0,
        monthlyFeeDate: fee?.monthlyFeeDate || null,
        mode: fee?.mode || "Monthly",
        discount: Number.isFinite(Number(fee?.discount)) ? Number(fee.discount) : 0,
        annualDiscount: Number.isFinite(Number(fee?.annualDiscount))
          ? Number(fee.annualDiscount)
          : 0,
      } } : {}),
      feeRecords:
        normalizedEnrollmentType === "Private" && Array.isArray(feeRecords) ? feeRecords : [],
      photo: photo || "",
      status: status || "Active",
    });

    return res.status(201).json({
      success: true,
      message: "Student created successfully",
      student,
    });
  } catch (error) {
    console.error("Create Student Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create student",
    });
  }
};

const getAllStudents = async (req, res) => {
  try {
    const { status, enrollmentClass, search } = req.query;
    const query = {};

    if (status) {
      query.status = status;
    }

    if (enrollmentClass) {
      query.enrollmentClass = enrollmentClass;
    }

    if (search) {
      const regex = new RegExp(search, "i");
      query.$or = [
        { fullName: regex },
        { fatherName: regex },
        { registrationNumber: regex },
        { cnicBForm: regex },
      ];
    }

    const students = await Student.find(query).sort({ createdAt: -1 }).lean();

    return res.status(200).json({
      success: true,
      total: students.length,
      students,
    });
  } catch (error) {
    console.error("Get Students Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch students",
    });
  }
};

const getStudentById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid student id",
      });
    }

    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    return res.status(200).json({
      success: true,
      student,
    });
  } catch (error) {
    console.error("Get Student Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch student",
    });
  }
};

const updateStudent = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid student id",
      });
    }

    const existingStudent = await Student.findById(id);
    if (!existingStudent) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const nextEnrollmentClass =
      req.body?.enrollmentClass ?? existingStudent.enrollmentClass;
    const [enrollmentClassName = "", enrollmentSection = ""] = String(
      nextEnrollmentClass || ""
    ).split(" - ");
    const requiredValues = {
      fullName: req.body?.fullName ?? existingStudent.fullName,
      fatherName: req.body?.fatherName ?? existingStudent.fatherName,
      classRoleNumber: req.body?.classRoleNumber ?? existingStudent.classRoleNumber,
      className:
        req.body?.className ?? existingStudent.className ?? enrollmentClassName,
      section: req.body?.section ?? existingStudent.section ?? enrollmentSection,
    };

    const requiredFields = [
      ["fullName", requiredValues.fullName, "Full Name"],
      ["fatherName", requiredValues.fatherName, "Father's Name"],
      ["classRoleNumber", requiredValues.classRoleNumber, "Class Role No."],
      ["className", requiredValues.className, "Class & Section"],
    ].filter(([field]) => Object.prototype.hasOwnProperty.call(req.body || {}, field));
    const missingField = requiredFields.find(([, value]) => !String(value || "").trim());

    if (missingField) {
      return res.status(400).json({
        success: false,
        message: `${missingField[2]} is required`,
      });
    }

    const normalizedClassRoleNumber = String(requiredValues.classRoleNumber || "").trim();
    const normalizedClassName = String(requiredValues.className || "").trim();
    const normalizedSection = String(requiredValues.section || "").trim();
    const duplicateClassRoleNumber = normalizedClassRoleNumber
      ? await Student.findOne({
          _id: { $ne: id },
          className: normalizedClassName,
          section: normalizedSection,
          classRoleNumber: { $regex: `^${normalizedClassRoleNumber.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
        })
      : null;
    if (duplicateClassRoleNumber) {
      return res.status(409).json({
        success: false,
        message: "This Class Role No. is already assigned in this class and section",
      });
    }

    const nextRegistrationNumber = String(
      req.body?.registrationNumber ?? existingStudent.registrationNumber ?? ""
    ).trim();
    if (nextRegistrationNumber) {
      const existingRegistration = await Student.findOne({
        registrationNumber: nextRegistrationNumber,
        _id: { $ne: id },
      });
      if (existingRegistration) {
        return res.status(409).json({
          success: false,
          message: "Another student with this registration number already exists",
        });
      }
    }

    const student = await Student.findByIdAndUpdate(id, {
      ...req.body,
      ...(normalizedClassRoleNumber ? { classRoleNumber: normalizedClassRoleNumber } : {}),
      className: requiredValues.className.trim(),
      section: requiredValues.section.trim(),
      ...(Object.prototype.hasOwnProperty.call(req.body, "admissionDate")
        ? { admissionDate: req.body.admissionDate || null }
        : {}),
    }, {
      new: true,
      runValidators: true,
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Student updated successfully",
      student,
    });
  } catch (error) {
    console.error("Update Student Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update student",
    });
  }
};

const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid student id",
      });
    }

    const student = await Student.findByIdAndDelete(id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Student deleted successfully",
    });
  } catch (error) {
    console.error("Delete Student Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete student",
    });
  }
};

export {
  createStudent,
  getAllStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
};
