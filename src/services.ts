import axios from "axios";
import { Worklog } from "./types";

export async function addWorklog({
  authKey,
  companyName,
  ticketNumber,
  worklog,
}: {
  authKey: string;
  companyName: string;
  ticketNumber: string;
  worklog: Worklog;
}) {
  try {
    const response = await axios.post(
      `https://${companyName}.atlassian.net/rest/api/2/issue/${ticketNumber}/worklog`, worklog
      {
        headers: {
          Authorization: `Basic ${authKey}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (err) {
    console.log(err);
  }
}
