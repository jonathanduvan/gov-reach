import express from "express";
// If you’re on Node 18+, global fetch exists. If not, uncomment:
// import fetch from "node-fetch";

const router = express.Router();

const US_STATE_ABBR: Record<string, string> = {
  Alabama:"AL", Alaska:"AK", Arizona:"AZ", Arkansas:"AR", California:"CA", Colorado:"CO",
  Connecticut:"CT", Delaware:"DE", "District of Columbia":"DC", Florida:"FL", Georgia:"GA",
  Hawaii:"HI", Idaho:"ID", Illinois:"IL", Indiana:"IN", Iowa:"IA", Kansas:"KS", Kentucky:"KY",
  Louisiana:"LA", Maine:"ME", Maryland:"MD", Massachusetts:"MA", Michigan:"MI", Minnesota:"MN",
  Mississippi:"MS", Missouri:"MO", Montana:"MT", Nebraska:"NE", Nevada:"NV", "New Hampshire":"NH",
  "New Jersey":"NJ", "New Mexico":"NM", "New York":"NY", "North Carolina":"NC", "North Dakota":"ND",
  Ohio:"OH", Oklahoma:"OK", Oregon:"OR", Pennsylvania:"PA", "Rhode Island":"RI", "South Carolina":"SC",
  "South Dakota":"SD", Tennessee:"TN", Texas:"TX", Utah:"UT", Vermont:"VT", Virginia:"VA",
  Washington:"WA", "West Virginia":"WV", Wisconsin:"WI", Wyoming:"WY"
};

// GET /api/geo/reverse?lat=...&lng=...
router.get("/reverse", async (req, res) => {
  try {
    console.log('we be searching loxrion');
    const { lat, lng } = req.query as { lat?: string; lng?: string };
    if (!lat || !lng) return res.status(400).json({ message: "lat and lng required" });

    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
      lat
    )}&lon=${encodeURIComponent(lng)}&zoom=10&addressdetails=1`;

    const resp = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "gov-reach/1.0 (admin@govreach.example)" // set to your contact
      }
    });
    if (!resp.ok) return res.status(502).json({ message: "upstream error" });

    const data = await resp.json();
    const a = data?.address || {};
    const city =
      a.city || a.town || a.village || a.hamlet || a.municipality || "";
    const county = a.county || "";
    const stateName = a.state || "";
    const stateAbbr =
      US_STATE_ABBR[stateName] ||
      (stateName.length === 2 ? stateName.toUpperCase() : "");

    // Return a normalized payload that the client can consume directly
    res.json({ city, county, state: stateName, stateAbbr, raw: data });
  } catch (e: any) {
    console.error("geo/reverse error", e);
    res.status(500).json({ message: "reverse failed" });
  }
});

export default router;
