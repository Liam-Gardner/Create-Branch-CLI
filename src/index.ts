import { Command, flags } from "@oclif/command";
import { exec } from "child_process";
import prompts from "prompts";
import axios from "axios";
import * as fs from "fs";
import path from "path";
import { getQuestions } from "./prompt.config";
import { Args, Flags, Status, UnitsOfTime, UserConfig, Worklog } from "./types";

class TicketToBranch extends Command {
  // #region fields
  private homedir = require("os").homedir();

  private userConfig = {
    authKey: "",
    autoCreateBranch: true,
    companyName: "",
    prefix: "",
    username: "",
    ticketNumber: "",
  };

  private usrStoragePath = path.join(this.homedir, ".ticket-to-branch");

  static description = "Create a git branch from your Jira ticket number";

  static flags = {
    assignUserToTicket: flags.boolean({
      char: "a",
      description: "Assign current user to ticket",
    }),
    reset: flags.boolean({ char: "r", description: "Reset the config" }),
    userConfig: flags.boolean({
      char: "c",
      description: "Show config",
    }),
    updateTicketStatus: flags.string({
      char: "s",
      description: "Update ticket status",
    }),
    updateTicketTime: flags.string({
      char: "t",
      description:
        "Update time spent on ticket in (m)inutes, (h)ours, or (d)ays",
      helpValue: "4h",
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
  async handleFlags(flags: Flags) {
    const {
      assignUserToTicket,
      reset,
      userConfig,
      updateTicketStatus,
      updateTicketTime,
    } = flags;
    if (assignUserToTicket) {
      const { authKey, companyName, ticketNumber } = this.getUserConfig();

      const { accountId } = await this.getCurrentUserDetails({
        authKey,
        companyName,
      });

      await this.assignUserToIssue({
        authKey,
        companyName,
        ticketNumber,
        accountId,
      });
      this.exit(0);
    }
    // TODO: handle blank authkeys!
    if (updateTicketStatus) {
      this.log("updateTicketStatus", updateTicketStatus);
      const { authKey, companyName, ticketNumber } = this.getUserConfig();
      // TODO: try/catch blocks
      const ticketUpdate = async () => {
        //TODO: if ticket is not assigned then transitions are limited
        const options = await this.getTransitions({
          authKey,
          companyName,
          ticketNumber,
        });

        const selectOptions = options?.map((o) => {
          return { title: o.name, value: o.id };
        });

        // if we don't find it from the user input...
        if (
          selectOptions &&
          !options?.some((option) => option.name === updateTicketStatus)
        ) {
          // ...give the user the list of possible statuses
          const { transition } = await prompts({
            type: "select",
            name: "transition",
            message: "Pick a status",
            choices: selectOptions,
            initial: 1,
          });

          await this.updateTicketStatus({
            authKey,
            companyName,
            ticketNumber,
            transition: {
              transition: { id: transition },
            },
          });
        } else {
          const transition = options?.find(
            (option) => option.name === updateTicketStatus
          );
          if (transition) {
            await this.updateTicketStatus({
              authKey,
              companyName,
              ticketNumber,
              transition: {
                transition: { id: transition.id },
              },
            });
          } else {
            this.error("Error updating ticket status");
          }
        }
      };
      await ticketUpdate();
      this.exit(0);
    }
    if (updateTicketTime) {
      const timeSpentSeconds = this.handleUpdateTicketTime(updateTicketTime);
      const { authKey, companyName, ticketNumber } = this.getUserConfig();

      await this.addWorklog({
        authKey,
        companyName,
        ticketNumber,
        worklog: { timeSpentSeconds },
      });
      this.exit(0);
    }
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
    } else {
      this.error("unknown flag", {
        suggestions: ["--help for list of commands"],
      });
    }
  }

  handleUpdateTicketTime(updateTicketTime: string) {
    const toSeconds = (units: number, unitOfTime: UnitsOfTime) => {
      if (unitOfTime === "m") {
        return units * 60;
      }
      if (unitOfTime === "h") {
        return units * 3600;
      }
      if (unitOfTime === "d") {
        return units * 86400;
      } else this.error("Unit of time must be either m, h or d");
    };

    const timeSpent = updateTicketTime.trim();
    const unitOfTime = timeSpent
      .charAt(timeSpent.length - 1)
      .toLowerCase() as UnitsOfTime;

    const units = timeSpent
      .split("")
      .filter((str) => str !== unitOfTime)
      .join();

    if (!isNaN(Number(units))) {
      return toSeconds(Number(units), unitOfTime);
    } else {
      this.error("Sorry, error setting worklog");
    }
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
        ticketNumber: "",
        username: "",
      });
    }
  }

  async captureUserInput(ticketNumber: string) {
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
          ticketNumber,
        });
      } catch (e) {
        this.error("captureUserInput", e);
      }
    }
  }

  async callJiraAPI({
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
      this.resetConfig("authKey");
      this.error("Jira API request error", err.message);
    }
  }

  async addWorklog({
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
      this.log(`Adding worklog to ${ticketNumber}...`);
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

  async getTransitions({
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
        //TODO: get response type
        (status: any) =>
          status.isAvailable && { id: status.id, name: status.name }
      ) as Array<{ id: string; name: string }>;
    } catch (err) {
      console.log("error", err);
    }
  }

  async updateTicketStatus({
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

  async getCurrentUserDetails({
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
      console.log(err);
    }
  }

  async assignUserToIssue({
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
        { accountId },
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
    this.loadConfig();

    if (!args.ticketNumber || args.ticketNumber.charAt(0) === "-") {
      await this.handleFlags(flags);
    } else {
      await this.captureUserInput(args.ticketNumber);

      const { authKey, companyName } = this.getUserConfig();
      const ticketName = await this.callJiraAPI({
        authKey,
        companyName,
        ticketNumber: args.ticketNumber,
      });

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
  }
  //#endregion
}

export = TicketToBranch;
