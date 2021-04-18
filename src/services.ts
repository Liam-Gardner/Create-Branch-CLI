import axios from "axios";

export async function getJiraIssues(authKey: string, companyName: string) {
  try {
    const response = await axios.get(
      `https://${companyName}.atlassian.net/rest/api/2/issuetype`,
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
