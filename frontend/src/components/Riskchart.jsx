import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const data = [
  { name: "Low Risk", value: 45 },
  { name: "Medium Risk", value: 30 },
  { name: "High Risk", value: 20 },
  { name: "Critical", value: 5 },
];

function Riskchart() {
  return (
    <div>
      <h2>SIF Risk Distribution</h2>

      <ResponsiveContainer width="100%" height={350}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={120}
            label
          >
            <Cell fill="#22c55e" />
            <Cell fill="#eab308" />
            <Cell fill="#f97316" />
            <Cell fill="#ef4444" />
          </Pie>

          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export default Riskchart;