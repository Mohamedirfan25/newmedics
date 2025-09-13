import React, {useState} from "react";
import { addReminder } from "../services/api";

export default function Reminders(){
  const [form, setForm] = useState({medicine_name:"", dosage:"", remind_at:""});
  const [created, setCreated] = useState(null);

  async function onSubmit(e){
    e.preventDefault();
    if(!form.medicine_name || !form.remind_at) return alert("Fill name and time");
    try{
      const r = await addReminder(form);
      setCreated(r.data.reminder || r.data);
      setForm({medicine_name:"", dosage:"", remind_at:""});
    }catch(err){ alert("Error: "+err) }
  }

  return (
    <div className="p-4 bg-white rounded shadow">
      <h3 className="font-semibold mb-2">Add Reminder</h3>
      <form onSubmit={onSubmit} className="space-y-2">
        <input value={form.medicine_name} onChange={e=>setForm({...form, medicine_name:e.target.value})} placeholder="Medicine name" className="w-full p-2 border rounded"/>
        <input value={form.dosage} onChange={e=>setForm({...form, dosage:e.target.value})} placeholder="Dosage" className="w-full p-2 border rounded"/>
        <input value={form.remind_at} onChange={e=>setForm({...form, remind_at:e.target.value})} type="datetime-local" className="w-full p-2 border rounded"/>
        <button className="px-3 py-1 bg-rose-600 text-white rounded">Create</button>
      </form>

      {created && <div className="mt-3 text-sm">Reminder created at: {created.remind_at}</div>}
      <div className="mt-3 text-xs text-slate-500">Note: notifications require background worker (Celery/cron) to send alerts.</div>
    </div>
  );
}
