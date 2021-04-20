import axios from "axios";
import { Status, Worklog } from "./types";

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
      `https://${companyName}.atlassian.net/rest/api/2/issue/${ticketNumber}/worklog`,
      worklog,
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

export async function getTransitions({
  authKey,
  companyName,
  ticketNumber,
}: {
  authKey: string;
  companyName: string;
  ticketNumber: string;
}) {
  try {
    const response = await axios.get(
      `https://${companyName}.atlassian.net/rest/api/2/issue/${ticketNumber}/transitions?expand=transitions.fields`,
      {
        headers: {
          Authorization: `Basic ${authKey}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data.transitions.map(
      (status: any) =>
        status.isAvailable && { id: Number(status.id), name: status.name }
    ) as Array<{ id: number; name: string }>;
  } catch (err) {
    console.log(err);
  }
}

export async function updateTicketStatus({
  authKey,
  companyName,
  ticketNumber,
  transition,
}: {
  authKey: string;
  companyName: string;
  ticketNumber: string;
  transition: Status;
}) {
  try {
    const response = await axios.post(
      `https://${companyName}.atlassian.net/rest/api/2/issue/${ticketNumber}/transitions`,
      transition,

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

export async function assignUserToTicket({
  authKey,
  companyName,
  ticketNumber,
  username,
}: {
  authKey: string;
  companyName: string;
  ticketNumber: string;
  username: string;
}) {
  try {
    const response = await axios.put(
      `https://${companyName}.atlassian.net/rest/api/2/issue/${ticketNumber}/assignee`,
      { name: username },
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

export async function getCurrentUserDetails({
  authKey,
  companyName,
}: {
  authKey: string;
  companyName: string;
}) {
  try {
    const response = await axios.put(
      `https://${companyName}.atlassian.net/rest/api/2/myself`,
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
