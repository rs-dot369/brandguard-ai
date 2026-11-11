const API_URL = "http://127.0.0.1:8000"; // Switch to Render backendURL later

export async function loginUser(username, password) {
  const formData = new URLSearchParams();
  formData.append("username", username);
  formData.append("password", password);

  const response = await fetch(`${API_URL}/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Invalid username or password");
  }

  const data = await response.json();
  // Store token and role in localStorage
  localStorage.setItem("access_token", data.access_token);
  localStorage.setItem("user_role", data.role);
  return data;
}

export function logoutUser() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("user_role");
  window.location.href = "/login";
}

export async function getProfile() {
  const token = localStorage.getItem("access_token");
  if (!token) return null;

  const response = await fetch(`${API_URL}/api/profile`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Session expired");
  }

  return response.json();
}