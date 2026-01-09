// frontend/src/pages/HowItWorks.jsx
import React from "react";
import {
  FaUser,
  FaGavel,
  FaEnvelope,
  FaDollarSign,
  FaFileInvoice,
  FaRedo,
} from "react-icons/fa";

const HowItWorks = () => {
  const steps = [
    {
      icon: <FaUser />,
      title: "User Registration",
      description:
        "Users must register or log in to perform operations such as posting auctions, bidding on items, accessing the dashboard, and sending payment proof.",
    },
    {
      icon: <FaGavel />,
      title: "Role Selection",
      description:
        'Users can register as either a "Bidder" or "Auctioneer." Bidders can bid on items, while Auctioneers can post items.',
    },
    {
      icon: <FaEnvelope />,
      title: "Winning Bid Notification",
      description:
        "After winning an item, the highest bidder will receive an email with the Auctioneer's payment method information, including bank transfer, Easypaisa, and PayPal.",
    },
    {
      icon: <FaDollarSign />,
      title: "Commission Payment",
      description:
        "If the Bidder pays, the Auctioneer must pay 5% of that payment to the platform. Failure to pay results in being unable to post new items, and a legal notice will be sent.",
    },
    {
      icon: <FaFileInvoice />,
      title: "Proof of Payment",
      description:
        "The platform receives payment proof as a screenshot and the total amount sent. Once approved by the Administrator, the unpaid commission of the Auctioneer will be adjusted accordingly.",
    },
    {
      icon: <FaRedo />,
      title: "Reposting Items",
      description:
        "If the Bidder does not pay, the Auctioneer can republish the item without any additional cost.",
    },
  ];

  return (
    <section className="page-container pt-20 pb-10 min-h-screen flex flex-col gap-8">
      <h1 className="text-red-600 text-4xl md:text-6xl font-extrabold text-center">
        Discover How PrimeBid Operates
      </h1>
      <div className="flex flex-col max-w-5xl mx-auto gap-6">
        {steps.map((step, index) => (
          <div
            key={index}
            className="glass flex flex-col gap-4 rounded-3xl p-6 shadow-glow bg-white/80 backdrop-blur-lg cursor-pointer transition-colors duration-300 hover:bg-red-600 hover:text-white"
          >
            <div className="w-14 h-14 flex items-center justify-center rounded-full bg-black text-white hover:bg-red-600 transition-colors duration-300 text-2xl">
              {step.icon}
            </div>
            <h3 className="text-red-600 text-2xl font-semibold hover:text-white transition-colors duration-300">
              {step.title}
            </h3>
            <p className="text-gray-700 hover:text-white text-lg leading-relaxed transition-colors duration-300">
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default HowItWorks;
