<?php
session_start();
if (($_SESSION['loggedin'] ?? false) !== true) { header('Location: login.php'); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); header('Allow: POST'); exit('Use the dashboard to delete a document.'); }
require_once __DIR__ . '/includes/form-security.php';
if (($_SESSION['role'] ?? '') !== 'admin' || !council_valid_csrf()) { http_response_code(403); exit('This request is not authorized.'); }
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/includes/document-storage.php';
$id = is_scalar($_POST['id'] ?? null) ? filter_var($_POST['id'], FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]) : false;
if (!$id) { http_response_code(400); exit('Choose a valid document.'); }
council_delete_documents($conn, [$id]);
header('Location: dashboard.php?bulk=success');
exit;
