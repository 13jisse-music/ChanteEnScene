<?php
session_start();
require_once __DIR__ . '/../../config/database.php';
if (!isset($_SESSION['admin_id'])) { http_response_code(401); exit; }

header('Content-Type: application/json');
$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true);

if ($method === 'GET') {
    echo json_encode($db->query("SELECT * FROM planning ORDER BY event_date ASC")->fetchAll());
    exit;
}

if ($method === 'POST') {
    $stmt = $db->prepare("INSERT INTO planning (title, event_date, event_time, location, description, is_public) VALUES (?, ?, ?, ?, ?, ?)");
    $stmt->execute([
        $input['title'],
        $input['event_date'],
        $input['event_time'],
        $input['location'] ?? '',
        $input['description'] ?? '',
        (int)($input['is_public'] ?? 1)
    ]);
    echo json_encode(['success' => true, 'id' => $db->lastInsertId()]);
    exit;
}

if ($method === 'PUT') {
    $stmt = $db->prepare("UPDATE planning SET title=?, event_date=?, event_time=?, location=?, description=?, is_public=? WHERE id=?");
    $stmt->execute([
        $input['title'],
        $input['event_date'],
        $input['event_time'],
        $input['location'] ?? '',
        $input['description'] ?? '',
        (int)($input['is_public'] ?? 1),
        (int)$input['id']
    ]);
    echo json_encode(['success' => true]);
    exit;
}

if ($method === 'DELETE') {
    $id = (int)($input['id'] ?? 0);
    if ($id) $db->prepare("DELETE FROM planning WHERE id = ?")->execute([$id]);
    echo json_encode(['success' => true]);
    exit;
}
