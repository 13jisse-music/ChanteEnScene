<?php
session_start();
require_once __DIR__ . '/../config/database.php';

// Initialize admin table
function initAdminTable(): void {
    $db = getDB();
    $db->exec("CREATE TABLE IF NOT EXISTS admins (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // Create default admin if none exists
    $stmt = $db->query("SELECT COUNT(*) FROM admins");
    if ((int)$stmt->fetchColumn() === 0) {
        $hash = password_hash('ChanteEnScene2025!', PASSWORD_BCRYPT);
        $db->prepare("INSERT INTO admins (username, password_hash) VALUES (?, ?)")
           ->execute(['admin', $hash]);
    }
}

function login(string $username, string $password): bool {
    $db = getDB();
    $stmt = $db->prepare("SELECT id, password_hash FROM admins WHERE username = ?");
    $stmt->execute([$username]);
    $admin = $stmt->fetch();

    if ($admin && password_verify($password, $admin['password_hash'])) {
        $_SESSION['admin_id'] = $admin['id'];
        $_SESSION['admin_user'] = $username;
        return true;
    }
    return false;
}

function isLoggedIn(): bool {
    return isset($_SESSION['admin_id']);
}

function requireAuth(): void {
    if (!isLoggedIn()) {
        header('Location: index.php');
        exit;
    }
}

function initAllTables(): void {
    $db = getDB();

    // Subscribers
    $db->exec("CREATE TABLE IF NOT EXISTS subscribers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // Planning
    $db->exec("CREATE TABLE IF NOT EXISTS planning (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        event_date DATE NOT NULL,
        event_time TIME DEFAULT NULL,
        location VARCHAR(255) DEFAULT '',
        description TEXT DEFAULT NULL,
        is_public TINYINT(1) DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // Prizes
    $db->exec("CREATE TABLE IF NOT EXISTS prizes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        rank_position INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT DEFAULT NULL,
        value VARCHAR(100) DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    initAdminTable();
}
