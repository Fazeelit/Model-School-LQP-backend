import express from "express";
import verifyToken, { authorizePermissions } from "../middleware/auth.js";
import {
  createStudent,
  getAllStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
} from "../controllers/studentController.js";

const router = express.Router();

router.post("/createStudent", createStudent);

router.get("/", getAllStudents);
router.get("/students", getAllStudents);

router.get("/:id", getStudentById);
router.get("/students/:id", getStudentById);

router.put("/:id", updateStudent);
router.patch("/:id", updateStudent);
router.put("/updateStudent/:id", updateStudent);

router.delete("/:id", verifyToken, authorizePermissions("STUDENTS_DELETE"), deleteStudent);
router.delete("/students/:id", verifyToken, authorizePermissions("STUDENTS_DELETE"), deleteStudent);

export default router;
