import axios from "axios";
import { Status, UserConfig, Worklog } from "./types";
import * as fs from "fs";
import path from "path";

//#region SETUP
const homedir = require("os").homedir();
const usrStoragePath = path.join(homedir, ".ticket-to-branch");
const data =
  fs.existsSync(usrStoragePath) &&
  fs.readFileSync(path.join(require("os").homedir(), ".ticket-to-branch"), {
    encoding: "utf8",
    flag: "r",
  });

const userConfig: UserConfig = data && JSON.parse(data);

const jiraAPI = axios.create({
  baseURL: `https://${userConfig.companyName}.atlassian.net/rest/api/2/`,
  headers: {
    Authorization: `Basic ${userConfig.authKey}`,
    "Content-Type": "application/json",
  },
});
//#endregion

//#region Endpoints
export async function getTicket({
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
      `https://${companyName}.atlassian.net/rest/api/2/issue/${ticketNumber}`,
      {
        headers: {
          Authorization: `Basic ${authKey}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data.fields.summary as string;
  } catch (err) {
    throw err;
  }
}

export async function getTicketStatus({
  ticketNumber,
}: {
  ticketNumber: string;
}) {
  try {
    const response = await jiraAPI.get(`issue/${ticketNumber}?fields=status`);
    return response.data.fields.status.statusCategory.name as string;
  } catch (err) {
    throw err;
  }
}

export async function addWorklog({
  ticketNumber,
  worklog,
}: {
  ticketNumber: string;
  worklog: Worklog;
}) {
  try {
    const response = await jiraAPI.post(
      `issue/${ticketNumber}/worklog`,
      worklog
    );
    return response.data;
  } catch (err) {
    console.log(err);
  }
}

export async function getTransitions({
  ticketNumber,
}: {
  ticketNumber: string;
}) {
  try {
    const response = await jiraAPI.get(
      `issue/${ticketNumber}/transitions?expand=transitions.fields`
    );
    return response.data.transitions.map(
      //TODO: get response type
      (status: any) =>
        status.isAvailable && { id: status.id, name: status.name }
    ) as Array<{ id: string; name: string }>;
  } catch (err) {
    console.log("error", err);
  }
}

export async function updateIssueStatusService({
  ticketNumber,
  transition,
}: {
  ticketNumber: string;
  transition: Status;
}) {
  try {
    const response = await jiraAPI.post(
      `/issue/${ticketNumber}/transitions`,
      transition
    );
    return response.data;
  } catch (err) {
    console.log(err);
  }
}

export async function assignUserToIssue({
  authKey,
  companyName,
  ticketNumber,
  accountId,
}: {
  authKey: string;
  companyName: string;
  ticketNumber: string;
  accountId: string;
}) {
  try {
    const response = await axios.put(
      `https://${companyName}.atlassian.net/rest/api/2/issue/${ticketNumber}/assignee`,
      {
        accountId,
      },
      {
        headers: {
          Authorization: `Basic ${authKey}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (err) {
    throw err;
    // console.log(err);
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
    const response = await axios.get(
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
    throw err;
    // console.log(err);
  }
}
//#endregion
