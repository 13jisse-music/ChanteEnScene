<?php
session_start();
require_once __DIR__ . '/../../config/database.php';
if (!isset($_SESSION['admin_id'])) { http_response_code(401); exit; }

header('Content-Type: application/json');
$db = getDB();
$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true);

if ($method === 'GET') {
    echo json_encode($db->query("SELECT * FROM prizes ORDER BY rank_position ASC")->fetchAll());
    exit;
}

if ($method === 'POST') {
    $stmt = $db->prepare("INSERT INTO prizes (rank_position, title, description, value) VALUES (?, ?, ?, ?)");
    $stmt->execute([
        (int)$input['rank_position'],
        $input['title'],
        $input['description'] ?? '',
        $input['value'] ?? ''
    ]);
    echo json_encode(['success' => true, 'id' => $db->lastInsertId()]);
    exit;
}

if ($method === 'PUT') {
    $stmt = $db->prepare("UPDATE prizes SET rank_position=?, title=?, description=?, value=? WHERE id=?");
    $stmt->execute([
        (int)$input['rank_position'],
        $input['title'],
        $input['description'] ?? '',
        $input['value'] ?? '',
        (int)$input['id']
    ]);
    echo json_encode(['success' => true]);
    exit;
}

if ($method === 'DELETE') {
    $id = (int)($input['id'] ?? 0);
    if ($id) $db->prepare("DELETE FROM prizes WHERE id = ?")->execute([$id]);
    echo json_encode(['success' => true]);
    exit;
}
