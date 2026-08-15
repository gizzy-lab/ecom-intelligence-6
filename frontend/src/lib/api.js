import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

export const LOGO_URL =
  "https://customer-assets-lxgj4vgw.emergentagent.net/job_ecom-intelligence-6/artifacts/eq4m4pl6_Runiq%20Studio%20Logo.png";

export const fmtMoney = (v) => {
  if (v == null || isNaN(v)) return "$0";
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
};

export const fmtMoneyFull = (v) =>
  `$${(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export const fmtNum = (v) => (v || 0).toLocaleString();
