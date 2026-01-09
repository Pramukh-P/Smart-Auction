// frontend/src/pages/Contact.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import emailjs from "@emailjs/browser";
import { toast } from "react-toastify";

const Contact = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const navigateTo = useNavigate();

  const handleContactForm = (e) => {
    e.preventDefault();
    setLoading(true);

    const templateParams = {
      name,
      email,
      phone,
      subject,
      message,
    };

    emailjs
      .send(
        "service_qoio4y7",
        "template_8t6z1g7",
        templateParams,
        "0HTYby44KVTUmG13d"
      )
      .then(() => {
        toast.success("Thank You! Your message has been sent successfully.");
        setLoading(false);
        navigateTo("/");
      })
      .catch(() => {
        toast.error("Failed to send message.");
        setLoading(false);
      });
  };

  return (
    <section className="page-container pt-20 pb-10 min-h-screen flex justify-center items-start">
      <div className="glass bg-white/80 backdrop-blur-lg rounded-3xl shadow-glow max-w-3xl w-full p-8">
        <h3 className="text-red-600 text-3xl font-semibold mb-8 text-center">
          Contact Us
        </h3>
        <form className="flex flex-col gap-6" onSubmit={handleContactForm}>
          {[
            { label: "Your Name", type: "text", value: name, setter: setName },
            { label: "Your Email", type: "email", value: email, setter: setEmail },
            { label: "Your Phone", type: "tel", value: phone, setter: setPhone },
            { label: "Subject", type: "text", value: subject, setter: setSubject },
          ].map(({ label, type, value, setter }, idx) => (
            <div key={idx} className="flex flex-col gap-2">
              <label className="text-gray-600 font-semibold">{label}</label>
              <input
                type={type}
                value={value}
                onChange={(e) => setter(e.target.value)}
                className="w-full p-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-600 transition"
                required
              />
            </div>
          ))}
          <div className="flex flex-col gap-2">
            <label className="text-gray-600 font-semibold">Message</label>
            <textarea
              rows={7}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-600 transition resize-none"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-md text-xl transition"
          >
            {loading ? "Sending Message..." : "Send Message"}
          </button>
        </form>
      </div>
    </section>
  );
};

export default Contact;
