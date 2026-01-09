// frontend/src/pages/Auctions.jsx
import Card from "@/custom-components/Card";
import Spinner from "@/custom-components/Spinner";
import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { getAllAuctionItems } from "@/store/slices/auctionSlice";

const Auctions = () => {
  const dispatch = useDispatch();
  const { allAuctions, loading } = useSelector((state) => state.auction);
  const [filtered, setFiltered] = useState([]);
  const [searchCategory, setSearchCategory] = useState("");
  const [categorySuggestions, setCategorySuggestions] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [condition, setCondition] = useState("");
  const [priceOrder, setPriceOrder] = useState("");
  const [liveAuctions, setLiveAuctions] = useState([]);
  const [endedAuctions, setEndedAuctions] = useState([]);

  useEffect(() => {
    dispatch(getAllAuctionItems());
  }, [dispatch]);

  // Fetch category suggestions (debounced)
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!searchCategory.trim()) {
        setCategorySuggestions([]);
        return;
      }
      try {
        const res = await fetch(`/api/categories/search?q=${searchCategory}`);
        const data = await res.json();
        setCategorySuggestions(data);
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };
    const delay = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(delay);
  }, [searchCategory]);

  // Filter and categorize auctions
  useEffect(() => {
    let filteredData = [...allAuctions];
    if (selectedCategory)
      filteredData = filteredData.filter(
        (item) =>
          item.category?.toLowerCase() === selectedCategory.toLowerCase()
      );

    if (condition)
      filteredData = filteredData.filter(
        (item) => item.condition?.toLowerCase() === condition.toLowerCase()
      );

    if (priceOrder === "lowToHigh")
      filteredData.sort((a, b) => a.startingBid - b.startingBid);
    else if (priceOrder === "highToLow")
      filteredData.sort((a, b) => b.startingBid - a.startingBid);

    const now = new Date();
    setLiveAuctions(filteredData.filter((item) => new Date(item.endTime) > now));
    setEndedAuctions(filteredData.filter((item) => new Date(item.endTime) <= now));
    setFiltered(filteredData);
  }, [selectedCategory, condition, priceOrder, allAuctions]);

  return (
    <>
      {loading ? (
        <div className="flex items-center justify-center min-h-screen pt-20 lg:pt-24">
          <Spinner />
        </div>
      ) : (
        <article className="page-container flex flex-col pt-24 pb-10">
          <section className="mb-12 max-w-7xl mx-auto w-full px-4">
            <h1 className="text-4xl md:text-6xl font-extrabold text-red-600 mb-10 text-center">
              Auctions
            </h1>
            {/* Filter Section */}
            <div className="mb-8 flex flex-wrap gap-4 justify-center items-center">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search Category"
                  value={searchCategory}
                  onChange={(e) => setSearchCategory(e.target.value)}
                  className="border border-gray-400 rounded-md px-4 py-2"
                />
                {categorySuggestions.length > 0 && (
                  <ul className="absolute bg-white border border-gray-300 mt-1 rounded-md shadow-md max-h-40 overflow-y-auto z-10">
                    {categorySuggestions.map((cat) => (
                      <li
                        key={cat._id}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                        onClick={() => {
                          setSelectedCategory(cat.name);
                          setSearchCategory(cat.name);
                          setCategorySuggestions([]);
                        }}
                      >
                        {cat.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="border border-gray-400 rounded-md px-4 py-2"
              >
                <option value="">All Conditions</option>
                <option value="New">New</option>
                <option value="Used">Used</option>
              </select>
              <select
                value={priceOrder}
                onChange={(e) => setPriceOrder(e.target.value)}
                className="border border-gray-400 rounded-md px-4 py-2"
              >
                <option value="">Sort by Price</option>
                <option value="lowToHigh">Price: Low to High</option>
                <option value="highToLow">Price: High to Low</option>
              </select>
              <button
                onClick={() => {
                  setSearchCategory("");
                  setSelectedCategory("");
                  setCondition("");
                  setPriceOrder("");
                }}
                className="bg-gray-300 px-4 py-2 rounded-md hover:bg-gray-400"
              >
                Reset
              </button>
            </div>
            {/* Live Auctions */}
            <div className="mb-16">
              <h2 className="text-2xl font-bold text-green-700 mb-6 text-center">
                🔥 Live Auctions
              </h2>
              {liveAuctions.length > 0 ? (
                <div className="grid gap-8 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                  {liveAuctions.map((element) => (
                    <div
                      key={element._id}
                      className="glass card rounded-2xl shadow-glow hover:shadow-glow-hover transition-transform transform hover:-translate-y-1"
                    >
                      <Card
                        title={element.title}
                        startTime={element.startTime}
                        endTime={element.endTime}
                        imgSrc={element.image?.url}
                        startingBid={element.startingBid}
                        id={element._id}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500">No live auctions available.</p>
              )}
            </div>
            {/* Ended Auctions */}
            <div>
              <h2 className="text-2xl font-bold text-red-700 mb-6 text-center">
                ⏰ Ended Auctions
              </h2>
              {endedAuctions.length > 0 ? (
                <div className="grid gap-8 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                  {endedAuctions.map((element) => (
                    <div
                      key={element._id}
                      className="glass card rounded-2xl opacity-75 hover:opacity-90 transition"
                    >
                      <Card
                        title={element.title}
                        startTime={element.startTime}
                        endTime={element.endTime}
                        imgSrc={element.image?.url}
                        startingBid={element.startingBid}
                        id={element._id}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500">No ended auctions.</p>
              )}
            </div>
          </section>
        </article>
      )}
    </>
  );
};

export default Auctions;
