"use client";

import { useState } from "react";

const reports = [
  {
    id: "R-001",
    category: "Unsafe Act",
    description: "Worker entered restricted area without PPE",
    risk: "Critical",
    status: "Open",
  },
  {
    id: "R-002",
    category: "Near Miss",
    description: "Oil leakage detected near drilling equipment",
    risk: "High",
    status: "Under Review",
  },
  {
    id: "R-003",
    category: "Unsafe Condition",
    description: "Damaged safety railing observed",
    risk: "Medium",
    status: "Resolved",
  },
  {
    id: "R-004",
    category: "Near Miss",
    description: "Vehicle nearly collided with pedestrian",
    risk: "High",
    status: "Open",
  },
];

export default function ReportsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [risk, setRisk] = useState("All");

  const filteredReports = reports.filter((report) => {
    const matchesSearch =
      report.id.toLowerCase().includes(search.toLowerCase()) ||
      report.description.toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      category === "All" || report.category === category;

    const matchesRisk =
      risk === "All" || report.risk === risk;

    return matchesSearch && matchesCategory && matchesRisk;
  });

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6 md:p-10">
      <div className="max-w-7xl mx-auto">

        <h1 className="text-4xl md:text-5xl font-bold mb-3">
          Safety Reports
        </h1>

        <p className="text-slate-400 mb-8">
          OIL Unsafe Act, Unsafe Condition & Near-Miss Reports
        </p>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">

          <input
            type="text"
            placeholder="Search reports..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 outline-none focus:border-blue-500"
          />

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-3"
          >
            <option>All</option>
            <option>Unsafe Act</option>
            <option>Unsafe Condition</option>
            <option>Near Miss</option>
          </select>

          <select
            value={risk}
            onChange={(e) => setRisk(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-3"
          >
            <option>All</option>
            <option>Critical</option>
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>

        </div>

        {/* Reports table */}
        <div className="overflow-x-auto rounded-xl border border-slate-700">
          <table className="w-full text-left">

            <thead className="bg-slate-800">
              <tr>
                <th className="px-5 py-4">Report ID</th>
                <th className="px-5 py-4">Category</th>
                <th className="px-5 py-4">Description</th>
                <th className="px-5 py-4">Risk Level</th>
                <th className="px-5 py-4">Status</th>
              </tr>
            </thead>

            <tbody>
              {filteredReports.map((report) => (
                <tr
                  key={report.id}
                  className="border-t border-slate-700 hover:bg-slate-900"
                >
                  <td className="px-5 py-4 font-semibold">
                    {report.id}
                  </td>

                  <td className="px-5 py-4">
                    {report.category}
                  </td>

                  <td className="px-5 py-4">
                    {report.description}
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        report.risk === "Critical"
                          ? "bg-red-600"
                          : report.risk === "High"
                          ? "bg-orange-500"
                          : "bg-yellow-500 text-black"
                      }`}
                    >
                      {report.risk}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    {report.status}
                  </td>
                </tr>
              ))}
            </tbody>

          </table>
        </div>

        {filteredReports.length === 0 && (
          <p className="text-center text-slate-400 mt-8">
            No reports found.
          </p>
        )}

      </div>
    </main>
  );
}