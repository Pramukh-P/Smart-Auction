// frontend/src/pages/CreateAuction.jsx
import { createAuction } from "@/store/slices/auctionSlice";
import React, { useEffect, useState } from "react";
import DatePicker from "react-datepicker";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import "react-datepicker/dist/react-datepicker.css";

const API_BASE = "http://localhost:5000/api/v1";

const CreateAuction = () => {
  const [image, setImage] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("");
  const [startingBid, setStartingBid] = useState("");
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);

  const [categories, setCategories] = useState([]);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);

  const dispatch = useDispatch();
  const { loading: auctionLoading } = useSelector((state) => state.auction);
  const { isAuthenticated, user, loading: userLoading } = useSelector(
    (state) => state.user
  );
  const navigateTo = useNavigate();

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(`${API_BASE}/categories`, {
          credentials: "include",
        });

        if (!res.ok) {
          const text = await res.text();
          console.error(
            "fetch /categories failed:",
            res.status,
            text || "no response body"
          );
          return;
        }

        const data = await res.json();
        setCategories(Array.isArray(data) ? data : data.categories || []);
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };
    fetchCategories();
  }, []);

  const imageHandler = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        setImage(file);
        setImagePreview(reader.result);
      };
    }
  };

  const handleAddNewCategory = async () => {
    const name = String(newCategoryName || "").trim();
    if (!name) return alert("Enter category name");

    setAddingCategory(true);
    try {
      const res = await fetch(`${API_BASE}/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name }),
      });

      const raw = await res.text(); // read body once
      if (!res.ok) {
        let message = raw;
        try {
          const parsed = JSON.parse(raw);
          message = parsed.message || raw;
        } catch {
          // raw is not JSON
        }
        alert(message || "Failed to add category");
        setAddingCategory(false);
        return;
      }

      let created;
      try {
        created = JSON.parse(raw);
      } catch {
        alert("Category created, but response was not valid JSON.");
        setAddingCategory(false);
        return;
      }

      setCategories((prev) =>
        [...prev, created].sort((a, b) => a.name.localeCompare(b.name))
      );
      setCategory(created.name);
      setShowNewCategoryInput(false);
      setNewCategoryName("");
      alert("Category added");
    } catch (error) {
      console.error("Error adding category:", error);
      alert("Error adding category");
    } finally {
      setAddingCategory(false);
    }
  };

  const handleCreateAuction = (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("image", image);
    formData.append("title", title);
    formData.append("description", description);
    formData.append("category", category);
    formData.append("condition", condition);
    formData.append("startingBid", startingBid);
    formData.append("startTime", startTime ? startTime.toISOString() : "");
    formData.append("endTime", endTime ? endTime.toISOString() : "");

    dispatch(createAuction(formData)).then(() => {
      navigateTo("/auctions");
    });
  };

  // Guard: only Auctioneer can access this page
  useEffect(() => {
    if (!userLoading) {
      if (!isAuthenticated || !user || user.role !== "Auctioneer") {
        navigateTo("/login");
      }
    }
  }, [isAuthenticated, user, userLoading, navigateTo]);

  if (userLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen text-xl">
        Checking authentication...
      </div>
    );
  }

  return (
    <article className="page-container pt-20 pb-10 flex flex-col gap-6 min-h-screen">
      <h1 className="text-red-600 text-4xl md:text-6xl font-bold mb-6 text-center">
        Create Auction
      </h1>
      <div className="glass bg-white/80 backdrop-blur-lg rounded-3xl shadow-glow max-w-4xl mx-auto p-8">
        <form
          className="flex flex-col gap-8 w-full"
          onSubmit={handleCreateAuction}
        >
          <section className="flex flex-col gap-6">
            <h2 className="text-xl md:text-2xl font-semibold text-gray-900">
              Auction Details
            </h2>
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="flex-1 flex flex-col">
                <label className="text-gray-600 font-medium mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-lg p-3 border-b border-gray-400 focus:outline-none focus:ring-2 focus:ring-red-600 rounded-sm bg-transparent"
                  required
                />
              </div>

              <div className="flex-1 flex flex-col">
                <label className="text-gray-600 font-medium mb-2">
                  Category
                </label>
                {showNewCategoryInput ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Enter new category"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="text-lg p-3 border border-gray-400 focus:outline-none focus:ring-2 focus:ring-red-600 rounded-md bg-transparent flex-1"
                    />
                    <button
                      type="button"
                      onClick={handleAddNewCategory}
                      className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                      disabled={addingCategory}
                    >
                      {addingCategory ? "Saving..." : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewCategoryInput(false);
                        setNewCategoryName("");
                      }}
                      className="bg-gray-400 text-white px-3 py-2 rounded-md hover:bg-gray-500"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <select
                    value={category}
                    onChange={(e) => {
                      if (e.target.value === "add_new") {
                        setShowNewCategoryInput(true);
                      } else {
                        setCategory(e.target.value);
                      }
                    }}
                    className="text-lg p-3 border-b border-gray-400 focus:outline-none focus:ring-2 focus:ring-red-600 rounded-sm bg-transparent"
                    required
                  >
                    <option value="" disabled>
                      Select Category
                    </option>
                    <option value="add_new">➕ Add New Category</option>
                    {categories.map((cat) => (
                      <option key={cat._id || cat.name} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-6">
              <div className="flex-1 flex flex-col">
                <label className="text-gray-600 font-medium mb-2">
                  Condition
                </label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="text-lg p-3 border-b border-gray-400 focus:outline-none focus:ring-2 focus:ring-red-600 rounded-sm bg-transparent"
                  required
                >
                  <option value="" disabled>
                    Select Condition
                  </option>
                  <option value="New">New</option>
                  <option value="Used">Used</option>
                </select>
              </div>

              <div className="flex-1 flex flex-col">
                <label className="text-gray-600 font-medium mb-2">
                  Starting Bid
                </label>
                <input
                  type="number"
                  value={startingBid}
                  onChange={(e) => setStartingBid(e.target.value)}
                  className="text-lg p-3 border-b border-gray-400 focus:outline-none focus:ring-2 focus:ring-red-600 rounded-sm bg-transparent"
                  required
                  min="0"
                  step="any"
                />
              </div>
            </div>

            <div className="flex flex-col">
              <label className="text-gray-600 font-medium mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                className="text-lg p-3 border border-gray-400 focus:outline-none focus:ring-2 focus:ring-red-600 rounded-md resize-none"
                required
              />
            </div>
          </section>

          <section className="flex flex-col sm:flex-row gap-6">
            <div className="flex-1 flex flex-col">
              <label className="text-gray-600 font-medium mb-2">
                Auction Starting Time
              </label>
              <DatePicker
                selected={startTime}
                onChange={(date) => setStartTime(date)}
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={15}
                dateFormat="MMMM d, yyyy h:mm aa"
                className="text-lg p-3 border-b border-gray-400 focus:outline-none focus:ring-2 focus:ring-red-600 rounded-sm w-full bg-transparent"
                placeholderText="Select start time"
                required
              />
            </div>

            <div className="flex-1 flex flex-col">
              <label className="text-gray-600 font-medium mb-2">
                Auction End Time
              </label>
              <DatePicker
                selected={endTime}
                onChange={(date) => setEndTime(date)}
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={15}
                dateFormat="MMMM d, yyyy h:mm aa"
                className="text-lg p-3 border-b border-gray-400 focus:outline-none focus:ring-2 focus:ring-red-600 rounded-sm w-full bg-transparent"
                placeholderText="Select end time"
                required
              />
            </div>
          </section>

          <section className="flex flex-col gap-4">
            <label className="font-semibold text-xl md:text-2xl text-gray-900">
              Auction Item Image
            </label>
            <div className="flex items-center justify-center w-full">
              <label
                htmlFor="dropzone-file"
                className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-400 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt={title}
                      className="w-44 h-auto object-contain"
                    />
                  ) : (
                    <>
                      <svg
                        className="w-8 h-8 mb-4 text-gray-500"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 20 16"
                      >
                        <path
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M13 13h3a3 3 0 000-6h-.025A5.56 5.56 0 0016 6.5 5.5 5.5 0 005.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 000 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                        />
                      </svg>
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Click to upload</span>{" "}
                        or drag and drop
                      </p>
                      <p className="text-xs text-gray-400">
                        SVG, PNG, JPG or GIF (MAX. 800x400px)
                      </p>
                    </>
                  )}
                </div>
                <input
                  id="dropzone-file"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={imageHandler}
                  required
                />
              </label>
            </div>
          </section>

          <button
            type="submit"
            disabled={auctionLoading}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-60 mx-auto w-full max-w-md py-3 rounded-md text-white font-semibold text-xl transition"
          >
            {auctionLoading ? "Creating Auction..." : "Create Auction"}
          </button>
        </form>
      </div>
    </article>
  );
};

export default CreateAuction;
