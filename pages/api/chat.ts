import type { NextApiRequest, NextApiResponse } from 'next'

const LCC_ENDPOINT_URL = process.env.LCC_ENDPOINT_URL || "";
const LCC_TOKEN = process.env.LCC_TOKEN || "";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
    const response = await fetch(LCC_ENDPOINT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": LCC_TOKEN
        },
        body: JSON.stringify({
          question: req.body.question,
          history: req.body.history
        }),
    });
    
    const data = await response.json();
    
    res.status(200).json({ result: data })
}