import prompts from "prompts";
import { UserConfig } from "./types";

export const getQuestions = ({
  companyName,
  prefix,
  username,
}: UserConfig): prompts.PromptObject[] => [
  {
    name: "username",
    type: "text",
    message: "Your email address used to sign in to Jira",
    initial: username,
  },
  {
    name: "companyName",
    type: "text",
    message:
      "Enter the company name used in your Jira URL, e.g. www.{my-company}.atlassian.net",
    //@ts-ignore type package is wrong!
    initial: (prev: string) => {
      if (companyName) {
        return companyName;
      } else {
        try {
          const guessedDomain = prev.split("@")[1];
          const companyName = guessedDomain.split(".")[0];
          return companyName;
        } catch (e) {
          return "";
        }
      }
    },
  },
  {
    name: "prefix",
    type: "text",
    message:
      "Enter a prefix for your branch names, e.g. {your-name}/BTK-1234-Create-new-feature",
    initial: prefix,
  },
  {
    name: "apiKey",
    type: "password",
    message:
      "Enter Your personal JIRA API key. Create one in your Jira profile settings if you haven't already",
  },
];
