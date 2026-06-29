const catchAsync = require("../../utils/catchAsync");
const { success } = require("../../utils/apiResponse");
const paymentService = require("../../services/admin/paymentService");

const getPendingPayments = catchAsync(async (req, res) => {
  const payments = await paymentService.getPendingPayments();
  success(res, { payments });
});

const getAllPayments = catchAsync(async (req, res) => {
  const result = await paymentService.getAllPayments(req.query.page, req.query.limit);
  success(res, result);
});

const approvePayment = catchAsync(async (req, res) => {
  const payment = await paymentService.approvePayment(req.params.id, req.admin._id);
  success(res, { payment }, "Payment approved");
});

const rejectPayment = catchAsync(async (req, res) => {
  const payment = await paymentService.rejectPayment(req.params.id, req.body.reason);
  success(res, { payment }, "Payment rejected");
});

const deleteCompleted = catchAsync(async (req, res) => {
  await paymentService.deleteCompletedPayments();
  success(res, null, "All completed payments deleted");
});

const deleteRejected = catchAsync(async (req, res) => {
  await paymentService.deleteRejectedPayments();
  success(res, null, "All rejected payments deleted");
});

const deletePayment = catchAsync(async (req, res) => {
  await paymentService.deletePayment(req.params.id);
  success(res, null, "Payment deleted");
});

module.exports = { getPendingPayments, getAllPayments, approvePayment, rejectPayment, deleteCompleted, deleteRejected, deletePayment };