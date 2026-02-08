<?php
require_once __DIR__ . '/auth.php';
initAllTables();

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $user = trim($_POST['username'] ?? '');
    $pass = $_POST['password'] ?? '';
    if (login($user, $pass)) {
        header('Location: dashboard.php');
        exit;
    }
    $error = 'Identifiants incorrects';
}

if (isLoggedIn()) {
    header('Location: dashboard.php');
    exit;
}
?>
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin — ChanteEnScène</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root { --pink: #e91e8c; --green: #7ec850; --dark: #0d0b1a; --card: #161228; --border: #2a2545; }
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'Inter',sans-serif; background:var(--dark); color:#fff; min-height:100vh; display:flex; align-items:center; justify-content:center; padding:1rem; }
        .login-card { background:var(--card); border:1px solid var(--border); border-radius:16px; padding:2.5rem 2rem; width:100%; max-width:380px; }
        .login-card h1 { font-size:1.5rem; font-weight:700; text-align:center; margin-bottom:0.3rem; }
        .login-card h1 span { color:var(--pink); }
        .login-card .sub { text-align:center; color:rgba(255,255,255,0.4); font-size:0.85rem; margin-bottom:2rem; }
        label { display:block; font-size:0.8rem; font-weight:600; color:rgba(255,255,255,0.5); text-transform:uppercase; letter-spacing:1px; margin-bottom:0.4rem; }
        input[type="text"], input[type="password"] {
            width:100%; padding:0.75rem 1rem; background:rgba(255,255,255,0.05); border:1px solid var(--border);
            border-radius:10px; color:#fff; font-family:'Inter',sans-serif; font-size:0.95rem; outline:none; margin-bottom:1.2rem; transition:border-color 0.3s;
        }
        input:focus { border-color:var(--pink); }
        button {
            width:100%; padding:0.85rem; background:linear-gradient(135deg,var(--pink),#c4157a); border:none;
            border-radius:10px; color:#fff; font-family:'Inter',sans-serif; font-weight:600; font-size:1rem; cursor:pointer; transition:transform 0.2s;
        }
        button:hover { transform:translateY(-1px); }
        .error { background:rgba(255,80,80,0.1); border:1px solid rgba(255,80,80,0.3); color:#ff6b6b; padding:0.6rem 1rem; border-radius:8px; font-size:0.85rem; margin-bottom:1rem; text-align:center; }
        .back { display:block; text-align:center; margin-top:1.5rem; color:rgba(255,255,255,0.3); font-size:0.8rem; text-decoration:none; }
        .back:hover { color:var(--green); }
    </style>
</head>
<body>
    <div class="login-card">
        <h1>Chant<span>En</span>Scène</h1>
        <p class="sub">Administration</p>
        <?php if ($error): ?><div class="error"><?= htmlspecialchars($error) ?></div><?php endif; ?>
        <form method="POST">
            <label>Utilisateur</label>
            <input type="text" name="username" required autofocus>
            <label>Mot de passe</label>
            <input type="password" name="password" required>
            <button type="submit">Se connecter</button>
        </form>
        <a href="/" class="back">← Retour au site</a>
    </div>
</body>
</html>
