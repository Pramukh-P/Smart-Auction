// frontend/src/pages/About.jsx
import React from "react";

const About = () => {
  const values = [
    {
      id: 1,
      title: "Integrity",
      description:
        "We prioritize honesty and transparency in all our dealings, ensuring a fair and ethical auction experience for everyone.",
    },
    {
      id: 2,
      title: "Innovation",
      description:
        "We continually enhance our platform with cutting-edge technology and features to provide users with a seamless and efficient auction process.",
    },
    {
      id: 3,
      title: "Community",
      description:
        "We foster a vibrant community of buyers and sellers who share a passion for finding and offering exceptional items.",
    },
    {
      id: 4,
      title: "Customer Focus",
      description:
        "We are committed to providing exceptional customer support and resources to help users navigate the auction process with ease.",
    },
  ];

  return (
    <section className="page-container flex flex-col justify-center min-h-screen py-10 gap-10 bg-gradient-to-br from-gray-50 via-blue-50 to-white">
      <div className="max-w-4xl mx-auto text-center glass rounded-3xl p-10 shadow-glow bg-white/80 backdrop-blur-lg">
        <h1 className="text-5xl md:text-7xl font-extrabold mb-6 gradient-text">
          About Us
        </h1>
        <p className="text-lg text-gray-700 leading-relaxed max-w-3xl mx-auto">
          Welcome to PrimeBid, the ultimate destination for online auctions and bidding excitement. Founded in 2024,
          we are dedicated to providing a dynamic and user-friendly platform for buyers and sellers to connect, explore,
          and transact in a secure and seamless environment.
        </p>
      </div>

      <div className="max-w-4xl mx-auto glass bg-white/85 backdrop-blur-lg rounded-3xl shadow-glow p-8">
        <h3 className="text-3xl font-semibold text-gray-900 mb-4">Our Mission</h3>
        <p className="text-gray-700 text-lg leading-relaxed">
          At PrimeBid, our mission is to revolutionize the way people buy and sell items online. We strive to create an engaging and trustworthy marketplace that empowers individuals and businesses to discover unique products,
          make informed decisions, and enjoy the thrill of competitive bidding.
        </p>
      </div>

      <div className="max-w-4xl mx-auto glass bg-white/85 backdrop-blur-lg rounded-3xl shadow-glow p-8">
        <h3 className="text-3xl font-semibold text-gray-900 mb-6">Our Values</h3>
        <ul className="space-y-6">
          {values.map(({ id, title, description }) => (
            <li key={id} className="text-lg text-gray-700">
              <span className="font-bold text-blue-600">{title}:</span> {description}
            </li>
          ))}
        </ul>
      </div>

      <div className="max-w-4xl mx-auto glass bg-white/85 backdrop-blur-lg rounded-3xl shadow-glow p-8">
        <h3 className="text-3xl font-semibold text-gray-900 mb-4">Our Story</h3>
        <p className="text-gray-700 text-lg leading-relaxed">
          Founded by CodeWithZeeshu, PrimeBid was born out of a passion for connecting people with unique and valuable items.
          With years of experience in the auction industry, our team is committed to creating a platform that offers an unparalleled auction experience for users worldwide.
        </p>
      </div>

      <div className="max-w-4xl mx-auto glass bg-white/85 backdrop-blur-lg rounded-3xl shadow-glow p-8">
        <h3 className="text-3xl font-semibold text-gray-900 mb-4">Join Us</h3>
        <p className="text-gray-700 text-lg leading-relaxed">
          Whether you're looking to buy, sell, or simply explore, PrimeBid invites you to join our growing community of auction enthusiasts.
          Discover new opportunities, uncover hidden gems, and experience the thrill of winning your next great find.
        </p>
      </div>

      <div className="max-w-4xl mx-auto text-center">
        <p className="text-blue-600 font-bold text-xl sm:text-2xl">
          Thank you for choosing PrimeBid. We look forward to being a part of your auction journey!
        </p>
      </div>
    </section>
  );
};

export default About;
