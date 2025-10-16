import React, { useState } from "react";
import { Form, Button, Alert, Container, Row, Col } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

function LoginForm({ onLoginSuccess }) {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
  });
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  localStorage.setItem("isApprover", "false");
  const [role, setRole] = useState("user");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setMessage(null);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    try {
      const res = await fetch("http://0.0.0.0:8000/login_or_register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setMessage(`Welcome, ${data.user.first_name}!`);

        if (role === "approver") {
          const approverRes = await fetch("http://0.0.0.0:8000/approvercheck", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: form.email }),
          });
          const approverData = await approverRes.json();

          if (approverRes.ok && approverData.is_approver) {
            localStorage.setItem("isApprover", "true");
            navigate("/approver");
            window.location.reload();
            return;
          } else {
            setError("You are not authorized as an approver.");
            return;
          }
        }

        onLoginSuccess(data.user);
        setForm({ first_name: "", last_name: "", email: "", phone: "" });
      } else {
        setError(data.detail || "Login failed");
      }
    } catch (err) {
      setError("Server error. Please try again.");
    }
  };

  return (
    <Container style={{ maxWidth: "400px", marginTop: "50px" }}>
      <Row className="justify-content-md-center">
        <Col>
          <h2 className="mb-4 text-center">User Login</h2>
          {error && <Alert variant="danger">{error}</Alert>}
          {message && <Alert variant="success">{message}</Alert>}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>First Name</Form.Label>
              <Form.Control
                type="text"
                name="first_name"
                placeholder="Enter first name"
                value={form.first_name}
                onChange={handleChange}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Last Name</Form.Label>
              <Form.Control
                type="text"
                name="last_name"
                placeholder="Enter last name"
                value={form.last_name}
                onChange={handleChange}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                name="email"
                placeholder="Enter email"
                value={form.email}
                onChange={handleChange}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Phone</Form.Label>
              <Form.Control
                type="tel"
                name="phone"
                placeholder="Enter phone number"
                value={form.phone}
                onChange={handleChange}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Select Role</Form.Label>
              <div>
                <Form.Check
                  inline
                  label="User"
                  type="radio"
                  value="user"
                  checked={role === "user"}
                  onChange={(e) => setRole(e.target.value)}
                />
                <Form.Check
                  inline
                  label="Approver"
                  type="radio"
                  value="approver"
                  checked={role === "approver"}
                  onChange={(e) => setRole(e.target.value)}
                />
              </div>
            </Form.Group>

            <Button type="submit" variant="primary" className="w-100">
              Continue
            </Button>
          </Form>
        </Col>
      </Row>
    </Container>
  );
}

export default LoginForm;
