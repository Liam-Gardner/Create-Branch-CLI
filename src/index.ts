import { Command, flags } from "@oclif/command";
import { exec } from "child_process";
import prompts from "prompts";
import axios from "axios";
import * as fs from "fs";
import path from "path";
import { getQuestions } from "./prompt.config";
import { Args, Flags, UserConfig } from "./types";
import { getJiraIssues } from "./services";

class TicketToBranch extends Command {
  // #region fields
  private homedir = require("os").homedir();

  private userConfig = {
    authKey: "",
    autoCreateBranch: true,
    companyName: "",
    prefix: "",
    username: "",
  };

  private usrStoragePath = path.join(this.homedir, ".ticket-to-branch");

  static description = "Create a git branch from your Jira ticket number";

  static flags = {
    help: flags.boolean({ char: "h" }),
    reset: flags.boolean({ char: "r", description: "Reset the config" }),
    userConfig: flags.boolean({
      char: "c",
      description: "Show config saved to file",
    }),
    version: flags.version({ char: "v" }),
  };

  static args: Args = [
    {
      name: "ticketNumber",
      required: false,
    },
  ];
  //#endregion

  // #region properties
  getUserConfig(): UserConfig {
    return this.userConfig;
  }

  setUserConfig(config: UserConfig) {
    this.userConfig = { ...this.userConfig, ...config };
    fs.writeFileSync(this.usrStoragePath, JSON.stringify(this.userConfig));
  }
  //#endregion

  // #region Methods
  handleFlags(flags: Flags) {
    const { reset, userConfig } = flags;
    if (reset) {
      const data = fs.readFileSync(this.usrStoragePath, {
        encoding: "utf8",
        flag: "r",
      });
      this.log(`Current config is ${data}`);
      this.log("Resetting config...");
      this.resetConfig();
      this.log(
        `reset complete, new config is ${JSON.stringify(this.getUserConfig())}`
      );
      this.exit(0);
    }
    if (userConfig) {
      const data = fs.readFileSync(this.usrStoragePath, {
        encoding: "utf8",
        flag: "r",
      });
      this.log(`Current config is ${data}`);
      this.exit(0);
    } else
      this.error("unknown flag", {
        suggestions: ["--help for list of commands"],
      });
  }

  static sanitiseTicketName(ticketName?: string) {
    return (
      ticketName &&
      ticketName
        .split(" ")
        .filter((str) => str.length !== 0)
        .filter((str) => str !== "-")
        .map((str) =>
          str.replace(/&/g, "and").replace(/%/g, "percent").replace(/[\W]/g, "")
        )
        .join("-")
    );
  }

  private resetConfig(field?: keyof UserConfig) {
    const currentConfig = this.getUserConfig();
    if (field) {
      this.setUserConfig({ ...currentConfig, [field]: "" });
    } else {
      this.setUserConfig({
        authKey: "",
        autoCreateBranch: true,
        companyName: "",
        prefix: "",
        username: "",
      });
    }
  }

  async captureUserInput() {
    const userConfig = this.getUserConfig();
    if (userConfig.authKey) {
      return;
    } else {
      try {
        const { username, companyName, prefix, apiKey } = await prompts(
          getQuestions(userConfig)
        );
        const authKey = Buffer.from(`${username}:${apiKey}`).toString("base64");

        this.setUserConfig({
          authKey,
          companyName,
          prefix,
          username,
        });
      } catch (e) {
        this.error("captureUserInput", e);
      }
    }
  }

  async callJiraAPI(ticketNumber: string) {
    const { authKey, companyName } = this.getUserConfig();
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
      this.resetConfig("authKey");
      this.error("Jira API request error", err.message);
    }
  }

  loadConfig() {
    if (fs.existsSync(this.usrStoragePath)) {
      const data = fs.readFileSync(this.usrStoragePath, {
        encoding: "utf8",
        flag: "r",
      });
      try {
        const parsedData: UserConfig = JSON.parse(data);
        this.setUserConfig(parsedData);
      } catch (e) {
        this.error("error getting user config", {
          exit: 0,
          suggestions: ['Try "createBranch --reset" to reset your config'],
        });
      }
    }
  }
  //#endregion

  // #region main
  async run() {
    const { args, flags } = this.parse(TicketToBranch);

    if (!args.ticketNumber || args.ticketNumber.charAt(0) === "-") {
      this.handleFlags(flags);
    }

    this.loadConfig();
    await this.captureUserInput();

    const ticketName = await this.callJiraAPI(args.ticketNumber);

    const sanitisedTicketName = TicketToBranch.sanitiseTicketName(ticketName);

    const { autoCreateBranch, prefix } = this.getUserConfig();
    autoCreateBranch &&
      sanitisedTicketName &&
      exec(
        prefix
          ? `git checkout -b ${prefix}/${args.ticketNumber}-${sanitisedTicketName}`
          : `git checkout -b ${args.ticketNumber}-${sanitisedTicketName}`,
        (error) => {
          if (error) {
            this.log(
              `Sorry, we can\'t generate a valid git branch from this ticket name - '${ticketName}' \n${error}`
            );
          }
        }
      );
  }
  //#endregion
}

export = TicketToBranch;
