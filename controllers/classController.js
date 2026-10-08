import mongoose from "mongoose";
import ClassModel from "../models/classModel.js";
import Teacher from "../models/teacherModel.js";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function findInchargeConflict(incharge, excludedId = null) {
  const normalizedIncharge = String(incharge || "").trim();
  if (!normalizedIncharge) return null;

  return ClassModel.findOne({
    incharge: { $regex: `^${escapeRegex(normalizedIncharge)}$`, $options: "i" },
    ...(excludedId ? { _id: { $ne: excludedId } } : {}),
  });
}

const createClass = async (req, res) => {
  try {
    const { name, section, incharge, academicYear } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Class name is required",
      });
    }

    const normalizedSection = String(section || "").trim().toUpperCase();
    if (!normalizedSection) {
      return res.status(400).json({
        success: false,
        message: "Section is required",
      });
    }

    const inchargeConflict = await findInchargeConflict(incharge);
    if (inchargeConflict) {
      return res.status(409).json({
        success: false,
        message: `This teacher is already assigned as class incharge for ${inchargeConflict.name} - Section ${inchargeConflict.section}`,
      });
    }

    const existingClass = await ClassModel.findOne({
      name: name.trim(),
      section: normalizedSection,
    });

    if (existingClass) {
      return res.status(409).json({
        success: false,
        message: "Class with this name and section already exists",
      });
    }

    const classItem = await ClassModel.create({
      name: name.trim(),
      section: normalizedSection,
      incharge: incharge?.trim() || "",
      academicYear: academicYear?.trim() || "",
    });

    return res.status(201).json({
      success: true,
      message: "Class created successfully",
      classItem,
    });
  } catch (error) {
    console.error("Create Class Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create class",
    });
  }
};

const getAllClasses = async (req, res) => {
  try {
    const { search } = req.query;
    const query = {};

    if (search) {
      const regex = new RegExp(search, "i");
      query.$or = [{ name: regex }, { section: regex }, { incharge: regex }, { academicYear: regex }];
    }

    const classes = await ClassModel.find(query).sort({ createdAt: -1 }).lean();

    return res.status(200).json({
      success: true,
      total: classes.length,
      classes,
    });
  } catch (error) {
    console.error("Get Classes Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch classes",
    });
  }
};

const getClassById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid class id",
      });
    }

    const classItem = await ClassModel.findById(id);

    if (!classItem) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    return res.status(200).json({
      success: true,
      classItem,
    });
  } catch (error) {
    console.error("Get Class Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch class",
    });
  }
};

const updateClass = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid class id",
      });
    }

    const nextName = req.body?.name?.trim();
    const nextSection = String(req.body?.section || "").trim().toUpperCase();

    if (!nextSection) {
      return res.status(400).json({
        success: false,
        message: "Section is required",
      });
    }

    const inchargeConflict = await findInchargeConflict(req.body?.incharge, id);
    if (inchargeConflict) {
      return res.status(409).json({
        success: false,
        message: `This teacher is already assigned as class incharge for ${inchargeConflict.name} - Section ${inchargeConflict.section}`,
      });
    }

    if (nextName) {
      const existingClass = await ClassModel.findOne({
        name: nextName,
        section: nextSection,
        _id: { $ne: id },
      });

      if (existingClass) {
        return res.status(409).json({
          success: false,
          message: "Another class with this name and section already exists",
        });
      }
    }

    const classItem = await ClassModel.findByIdAndUpdate(id, {
      ...req.body,
      section: nextSection,
    }, {
      new: true,
      runValidators: true,
    });

    if (!classItem) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Class updated successfully",
      classItem,
    });
  } catch (error) {
    console.error("Update Class Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update class",
    });
  }
};

const deleteClass = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid class id",
      });
    }

    const classItem = await ClassModel.findByIdAndDelete(id);

    if (!classItem) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Class deleted successfully",
    });
  } catch (error) {
    console.error("Delete Class Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete class",
    });
  }
};

const getClassWithStudents = async (req, res) => {
  try {
    const { className, section } = req.params;

    const classItem = await ClassModel.findOne({
      name: decodeURIComponent(className),
      section: decodeURIComponent(section).toUpperCase(),
    }).lean();

    if (!classItem) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    // Student backend model does not exist yet, so return class metadata only for now.
    return res.status(200).json({
      success: true,
      classItem: {
        ...classItem,
        students: [],
        totalStudents: 0,
      },
    });
  } catch (error) {
    console.error("Get Class With Students Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch class details",
    });
  }
};

const getClassTeacherOptions = async (req, res) => {
  try {
    const teachers = await Teacher.find({}, { "personalInfo.name": 1, "educationInfo.majorSubject": 1 })
      .sort({ createdAt: -1 })
      .lean();

    const options = teachers.map((teacher) => ({
      id: teacher._id,
      name: teacher.personalInfo?.name || "",
      subject: teacher.educationInfo?.majorSubject || "",
    }));

    return res.status(200).json({
      success: true,
      teachers: options,
    });
  } catch (error) {
    console.error("Get Class Teacher Options Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch teacher options",
    });
  }
};

export {
  createClass,
  getAllClasses,
  getClassById,
  updateClass,
  deleteClass,
  getClassWithStudents,
  getClassTeacherOptions,
};
