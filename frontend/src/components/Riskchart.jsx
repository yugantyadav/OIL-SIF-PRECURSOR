import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

const FALLBACK = [
  { name: "Low", value: 45 },
  { name: "Medium", value: 30 },
  { name: "High", value: 20 },
  { name: "Critical", value: 5 },
];
const COLORS = { Low: "#22c55e", Medium: "#eab308", High: "#f97316", Critical: "#ef4444" };

function Riskchart({ byRisk }) {
  const data = byRisk
    ? Object.entries(byRisk).map(([k, v]) => ({ name: k, value: v }))
    : FALLBACK;

  return (
    <div>
      <h2>SIF Risk Distribution</h2>
      <ResponsiveContainer width="100%" height={350}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} label>
            {data.map((e, i) => <Cell key={i} fill={COLORS[e.name] || "#3b82f6"} />)}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export default Riskchart;
