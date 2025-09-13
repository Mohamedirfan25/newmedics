import React, {useEffect,useState} from "react";
import { getDashboard } from "../services/api";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

export default function Dashboard(){
  const [data,setData]=useState(null);
  useEffect(()=>{ getDashboard().then(r=>setData(r.data)).catch(()=>{}) },[]);
  if(!data) return <div className="p-4 bg-white rounded shadow">Loading...</div>;
  const pie = [{name:"Done", value:data.done},{name:"Pending", value:data.pending}];
  const COLORS=["#00C49F","#FF8042"];
  return (
    <div className="p-4 bg-white rounded shadow">
      <h3 className="font-semibold">Dashboard</h3>
      <div className="mt-2">Prescriptions: {data.prescriptions} — Medicines: {data.medicines} — Reminders: {data.reminders}</div>
      <div className="h-48 mt-3">
        <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={pie} dataKey="value" cx="50%" cy="50%" outerRadius={60} label>{pie.map((entry,i)=><Cell key={i} fill={COLORS[i%COLORS.length]} />)}</Pie><Tooltip/></PieChart></ResponsiveContainer>
      </div>
    </div>
  );
}
