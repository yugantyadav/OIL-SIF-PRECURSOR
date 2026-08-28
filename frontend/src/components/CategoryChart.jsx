import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const FALLBACK = [
  { category: "Unsafe Act", count: 520 },
  { category: "Unsafe Condition", count: 380 },
  { category: "Near Miss", count: 324 },
  { category: "High Risk", count: 86 },
];

function CategoryChart({ byCategory }) {
  const data = byCategory
    ? Object.entries(byCategory).map(([category, count]) => ({ category, count }))
    : FALLBACK;

  return (
    <div>
      <h2>Report Categories</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="category" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="count" fill="#3b82f6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default CategoryChart;
