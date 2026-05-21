"use client";

import { useState } from "react";

export default function Page() {
  const [smooth, setSmooth] = useState();
  const channel = new BroadcastChannel("mixerOutputVj");
  channel.onmessage = (e) => {
    console.log(e.data);
    setSmooth(e.data.smooth);
  };

  return (
    <div style={{ margin: 0, padding: 0 }}>
      <h1>{smooth}</h1>
    </div>
  );
}
