import mongoose from "mongoose";
import Teacher from "../models/teacherModel.js";

const TEACHER_ID_PREFIX = "TECH-";

function normalizeTeacherBiometrics(biometricInfo = {}) {
  const fingerprintSamples = Array.isArray(biometricInfo.fingerprintSamples)
    ? biometricInfo.fingerprintSamples
        .map((sample, index) => ({
          step: Number(sample?.step) || index + 1,
          quality: Number(sample?.quality) || 0,
          capturedAt: sample?.capturedAt || null,
        }))
        .filter((sample) => sample.quality > 0)
    : [];
  const faceSamples = Array.isArray(biometricInfo.faceSamples)
    ? biometricInfo.faceSamples
        .map((sample, index) => ({
          step: Number(sample?.step) || index + 1,
          confidence: Number(sample?.confidence) || 0,
          capturedAt: sample?.capturedAt || null,
        }))
        .filter((sample) => sample.confidence > 0)
    : [];
  const fingerprint =
    typeof biometricInfo.fingerprint === "string"
      ? biometricInfo.fingerprint.trim()
      : biometricInfo.fingerprint?.templateId?.trim?.() || "";
  const facerecognition =
    typeof biometricInfo.facerecognition === "string"
      ? biometricInfo.facerecognition.trim()
      : biometricInfo.face?.faceId?.trim?.() || "";

  return {
    fingerprint,
    fingerprintEnrolled:
      Boolean(biometricInfo.fingerprintEnrolled) ||
      Boolean(biometricInfo.fingerprint?.enrolled) ||
      fingerprintSamples.length >= 5 ||
      Boolean(fingerprint),
    fingerprintCapturedAt:
      biometricInfo.fingerprintCapturedAt ||
      biometricInfo.fingerprint?.enrolledAt ||
      null,
    fingerprintSamples,
    facerecognition,
    faceEnrolled:
      Boolean(biometricInfo.faceEnrolled) ||
      Boolean(biometricInfo.face?.enrolled) ||
      faceSamples.length >= 5 ||
      Boolean(facerecognition),
    faceCapturedAt:
      biometricInfo.faceCapturedAt ||
      biometricInfo.face?.enrolledAt ||
      null,
    faceSamples,
  };
}

function hasTeacherBiometrics(biometricInfo) {
  return Boolean(
    biometricInfo &&
      (biometricInfo.fingerprint ||
        biometricInfo.facerecognition ||
        biometricInfo.fingerprintEnrolled ||
        biometricInfo.faceEnrolled ||
        biometricInfo.fingerprintCapturedAt ||
        biometricInfo.faceCapturedAt ||
        biometricInfo.fingerprintSamples?.length ||
        biometricInfo.faceSamples?.length)
  );
}

function normalizeTeacherIdValue(value) {
  const normalizedValue = String(value || "").trim().toUpperCase();
  if (!normalizedValue) return "";

  const numericMatch = normalizedValue.match(/(\d+)$/);
  if (!numericMatch) return normalizedValue;

  return `${TEACHER_ID_PREFIX}${numericMatch[1].padStart(3, "0")}`;
}

async function getNextTeacherId() {
  const teachersWithIds = await Teacher.find({
    teacherId: { $regex: `^${TEACHER_ID_PREFIX}\\d+$`, $options: "i" },
  })
    .select("teacherId")
    .lean();

  const highestSequence = teachersWithIds.reduce((maxValue, teacher) => {
    const currentSequence = Number(
      String(teacher?.teacherId || "")
        .replace(TEACHER_ID_PREFIX, "")
        .trim()
    );

    return Number.isFinite(currentSequence) ? Math.max(maxValue, currentSequence) : maxValue;
  }, 0);

  return `${TEACHER_ID_PREFIX}${String(highestSequence + 1).padStart(3, "0")}`;
}

async function ensureTeacherId(teacherDocument) {
  if (!teacherDocument) return teacherDocument;
  if (String(teacherDocument.teacherId || "").trim()) return teacherDocument;

  teacherDocument.teacherId = await getNextTeacherId();
  await teacherDocument.save();
  return teacherDocument;
}

const createTeacher = async (req, res) => {
  try {
    const { teacherId, personalInfo = {}, educationInfo = {}, biometricInfo = {}, classAssign = {}, salaryInfo = {}, status } =
      req.body;

    const totalPeriods = Number(classAssign.totalPeriods);
    if (
      !personalInfo.name?.trim() ||
      !classAssign.teacherType ||
      !Number.isInteger(totalPeriods) ||
      totalPeriods < 1 ||
      (classAssign.teacherType === "Class Incharge" && !classAssign.classIncharge?.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "Full name, teacher type, total periods, and class incharge when applicable are required",
      });
    }

    if (personalInfo.cnic) {
      const existingTeacher = await Teacher.findOne({
        "personalInfo.cnic": personalInfo.cnic.trim(),
      });

      if (existingTeacher) {
        return res.status(409).json({
          success: false,
          message: "Teacher with this CNIC already exists",
        });
      }
    }

    const nextTeacherId = normalizeTeacherIdValue(teacherId) || (await getNextTeacherId());
    const existingTeacherId = await Teacher.findOne({ teacherId: nextTeacherId });
    if (existingTeacherId) {
      return res.status(409).json({
        success: false,
        message: "Teacher ID already exists",
      });
    }

    const normalizedBiometricInfo = normalizeTeacherBiometrics(biometricInfo);

    const teacher = await Teacher.create({
      teacherId: nextTeacherId,
      personalInfo: {
        name: personalInfo.name.trim(),
        fatherHusbandName: personalInfo.fatherHusbandName?.trim() || "",
        gender: personalInfo.gender || "Male",
        dob: personalInfo.dob || null,
        cnic: personalInfo.cnic?.trim() || "",
        contactNumber: personalInfo.contactNumber?.trim() || "",
        whatsappNumber: personalInfo.whatsappNumber?.trim() || "",
        address: personalInfo.address?.trim() || "",
        photo: personalInfo.photo || "",
      },
      educationInfo: {
        academicQualification: educationInfo.academicQualification?.trim() || "",
        majorSubject: educationInfo.majorSubject?.trim() || "",
        professionalQualification: educationInfo.professionalQualification?.trim() || "",
        dateOfAppointment: educationInfo.dateOfAppointment || null,
        experience: Number.isFinite(Number(educationInfo.experience))
          ? Number(educationInfo.experience)
          : 0,
        lastInstitute: educationInfo.lastInstitute?.trim() || "",
      },
      ...(hasTeacherBiometrics(normalizedBiometricInfo)
        ? { biometricInfo: normalizedBiometricInfo }
        : {}),
      classAssign: {
        teacherType: classAssign.teacherType,
        classIncharge: classAssign.classIncharge?.trim() || "",
        totalPeriods,
        periodsAssignments: Array.isArray(classAssign.periodsAssignments)
          ? classAssign.periodsAssignments
          : [],
      },
      salaryInfo: {
        basicSalary: Number.isFinite(Number(salaryInfo.basicSalary))
          ? Number(salaryInfo.basicSalary)
          : 0,
        houseRent: Number.isFinite(Number(salaryInfo.houseRent))
          ? Number(salaryInfo.houseRent)
          : 0,
        medicalAllowance: Number.isFinite(Number(salaryInfo.medicalAllowance))
          ? Number(salaryInfo.medicalAllowance)
          : 0,
        conveyanceAllowance: Number.isFinite(Number(salaryInfo.conveyanceAllowance))
          ? Number(salaryInfo.conveyanceAllowance)
          : 0,
        otherAllowances: Number.isFinite(Number(salaryInfo.otherAllowances))
          ? Number(salaryInfo.otherAllowances)
          : 0,
        totalSalary: Number.isFinite(Number(salaryInfo.totalSalary))
          ? Number(salaryInfo.totalSalary)
          : 0,
        bankName: salaryInfo.bankName?.trim() || "",
        accountTitle: salaryInfo.accountTitle?.trim() || "",
        bankAccount: salaryInfo.bankAccount?.trim() || "",
      },
      status: status || "Active",
    });

    return res.status(201).json({
      success: true,
      message: "Teacher created successfully",
      teacher,
    });
  } catch (error) {
    console.error("Create Teacher Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create teacher",
    });
  }
};

const getAllTeachers = async (req, res) => {
  try {
    const { status, teacherType, search } = req.query;

    const query = {};

    if (status) {
      query.status = status;
    }

    if (teacherType) {
      query["classAssign.teacherType"] = teacherType;
    }

    if (search) {
      const regex = new RegExp(search, "i");
      query.$or = [
        { teacherId: regex },
        { "personalInfo.name": regex },
        { "personalInfo.fatherHusbandName": regex },
        { "personalInfo.cnic": regex },
        { "personalInfo.contactNumber": regex },
        { "personalInfo.whatsappNumber": regex },
        { "educationInfo.majorSubject": regex },
        { "educationInfo.lastInstitute": regex },
      ];
    }

    const teachers = await Teacher.find(query).sort({ createdAt: -1 });
    for (const teacher of teachers) {
      await ensureTeacherId(teacher);
    }

    return res.status(200).json({
      success: true,
      total: teachers.length,
      teachers,
    });
  } catch (error) {
    console.error("Get Teachers Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch teachers",
    });
  }
};

const getTeacherById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid teacher id",
      });
    }

    const teacher = await Teacher.findById(id);

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }

    await ensureTeacherId(teacher);

    return res.status(200).json({
      success: true,
      teacher,
    });
  } catch (error) {
    console.error("Get Teacher Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch teacher",
    });
  }
};

const updateTeacher = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid teacher id",
      });
    }

    const nextCnic = req.body?.personalInfo?.cnic?.trim();
    if (nextCnic) {
      const existingCnic = await Teacher.findOne({
        "personalInfo.cnic": nextCnic,
        _id: { $ne: id },
      });

      if (existingCnic) {
        return res.status(409).json({
          success: false,
          message: "Another teacher with this CNIC already exists",
        });
      }
    }

    const existingTeacher = await Teacher.findById(id);
    if (!existingTeacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }

    await ensureTeacherId(existingTeacher);

    const nextPersonalInfo = req.body?.personalInfo || existingTeacher.personalInfo;
    const nextClassAssign = req.body?.classAssign || existingTeacher.classAssign;
    const nextTotalPeriods = Number(nextClassAssign?.totalPeriods);
    if (
      !nextPersonalInfo?.name?.trim() ||
      !nextClassAssign?.teacherType ||
      !Number.isInteger(nextTotalPeriods) ||
      nextTotalPeriods < 1 ||
      (nextClassAssign.teacherType === "Class Incharge" && !nextClassAssign.classIncharge?.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "Full name, teacher type, total periods, and class incharge when applicable are required",
      });
    }

    const { biometricInfo: requestedBiometricInfo, ...bodyWithoutBiometricInfo } = req.body;
    const normalizedBiometricInfo = normalizeTeacherBiometrics(requestedBiometricInfo || {});
    const nextBody = {
      ...bodyWithoutBiometricInfo,
      teacherId: existingTeacher.teacherId,
      ...(hasTeacherBiometrics(normalizedBiometricInfo)
        ? { biometricInfo: normalizedBiometricInfo }
        : {}),
    };

    const teacher = await Teacher.findByIdAndUpdate(id, nextBody, {
      new: true,
      runValidators: true,
    });

    return res.status(200).json({
      success: true,
      message: "Teacher updated successfully",
      teacher,
    });
  } catch (error) {
    console.error("Update Teacher Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update teacher",
    });
  }
};

const deleteTeacher = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid teacher id",
      });
    }

    const teacher = await Teacher.findByIdAndDelete(id);

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Teacher deleted successfully",
    });
  } catch (error) {
    console.error("Delete Teacher Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete teacher",
    });
  }
};

export {
  createTeacher,
  getAllTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher,
};
