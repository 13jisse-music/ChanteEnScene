<?php
session_start();
require_once __DIR__ . '/../../config/database.php';
if (!isset($_SESSION['admin_id'])) { http_response_code(401); exit; }

header('Content-Type: application/json');
$db = getDB();

// CSV Export
if (isset($_GET['export']) && $_GET['export'] === 'csv') {
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename=inscrits_chantenscene_' . date('Y-m-d') . '.csv');
    $out = fopen('php://output', 'w');
    fputcsv($out, ['Email', 'Date inscription']);
    $rows = $db->query("SELECT email, created_at FROM subscribers ORDER BY created_at DESC")->fetchAll();
    foreach ($rows as $r) fputcsv($out, [$r['email'], $r['created_at']]);
    fclose($out);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    echo json_encode($db->query("SELECT * FROM subscribers ORDER BY created_at DESC")->fetchAll());
    exit;
}

if ($method === 'DELETE') {
    $input = json_decode(file_get_contents('php://input'), true);
    $id = (int)($input['id'] ?? 0);
    if ($id) $db->prepare("DELETE FROM subscribers WHERE id = ?")->execute([$id]);
    echo json_encode(['success' => true]);
    exit;
}
