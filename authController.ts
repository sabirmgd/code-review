import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  Res,
  HttpStatus,
  Logger,
  Inject,
} from '@nestjs/common';
import { AuthService } from './service';
import { authEndpoints } from '@src/common/endpoints';
import { AuthGuard } from '@nestjs/passport';
import { RedirectAction } from './github/enums';
import { GitHubAppClient } from './github/client';
import { UserService } from '@src/api/admin/user/service';
import { OrganizationService } from '@src/api/admin/organization/service';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { INSTALLATION_ID_REQUIRED } from '@src/common/error-messages';
import { GitLabClient } from './gitlab/client';
import { Tokens } from './tokens';
import { GitProviderName } from './entity';
import { OrganizationStatus } from '@src/api/admin/organization/enums';
import { group } from 'console';
import { JwtAuthGuard } from './jwt-auth-guard';
import { TokenPayload } from './Token';
import GitLabGroup, { mapGitLabGroups } from './gitlab/group';

@Controller()
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  private readonly UI_HOST = this.configService.get<string>('uiHost');

  private readonly installationUrls = {
    github: this.configService.get<string>('github.appInstallationUrl'),
    gitlab: `${this.UI_HOST}/admin/choose-group`,
  };

  constructor(
    private authService: AuthService,
    private githubAppClient: GitHubAppClient,
    private userService: UserService,
    private organizationService: OrganizationService,
    private configService: ConfigService,
    @Inject(GitLabClient)
    private readonly gitLabClientFactory: (token: string) => GitLabClient,
  ) {}

  @Get(authEndpoints.login('github'))
  @UseGuards(AuthGuard('github'))
  async loginWithGithub() {
    // Initiates GitHub OAuth login
  }
  @Get(authEndpoints.loginCallback('github'))
  @UseGuards(AuthGuard('github'))
  async handleGithubLoginCallback(@Req() req: Request, @Res() res: Response) {
    await this.handleLoginCallback(req, res, 'github');
  }

  @Get(authEndpoints.installationCallback('github'))
  async handleGithubSuccessfulInstallation(@Req() req, @Res() res) {
    const installationId = req.query.installation_id;
    if (!installationId) {
      return res.status(HttpStatus.BAD_REQUEST).send(INSTALLATION_ID_REQUIRED);
    }

    try {
      const installation =
        await this.githubAppClient.getInstallationDetails(installationId);

      const user = await this.userService.getUserByRegistrationChannelUserId(
        installation.account.id.toString(),
      );

      const gitOrganizationName = installation?.account?.login;

      const gitProvider =
        await this.authService.findGitProviderByRepositoryCollectionId(
          gitOrganizationName,
        );

      if (gitProvider) {
        await this.authService.createGitProvider({
          name: GitProviderName.GITHUB,
          repositoryCollectionId: gitOrganizationName,
          organization: user.organization,
          metadata: { installationId },
        });
      }

      await this.organizationService.update(user.organization.id, {
        status: OrganizationStatus.Registered,
      });

      const tokens = await this.authService.getTokens(user);
      this.setTokensAsCookies(res, tokens);

      return res.redirect(`${this.UI_HOST}/admin/get-started`);
    } catch (error) {
      this.logger.error('Failed to finish organization registration:', error);
      return res.status(500).send('Failed to finish organization registration');
    }
  }

  @Get(authEndpoints.login('gitlab'))
  @UseGuards(AuthGuard('gitlab'))
  async loginWithGitlab() {
    // Initiates Gitlab OAuth login
  }

  @Get(authEndpoints.loginCallback('gitlab'))
  @UseGuards(AuthGuard('gitlab'))
  async handleGitlabLoginCallback(@Req() req: Request, @Res() res: Response) {
    await this.handleLoginCallback(req, res, 'gitlab');
  }

  private async handleLoginCallback(
    @Req() req,
    @Res() res: Response,
    provider: string,
  ) {
    const { user, action, accessToken } = req.user as any;

    const tokens = await this.authService.getTokens(user, accessToken);

    this.setTokensAsCookies(res, tokens);
    switch (action) {
      case RedirectAction.ToDashboard:
        res.redirect(`${this.UI_HOST}/dashboard`);
        break;
      case RedirectAction.ToInstallApp:
        const installationUrl = this.installationUrls[provider];
        res.redirect(installationUrl);
        break;
      default:
        res.redirect(`${this.UI_HOST}`);
        break;
    }
    return user;
  }

  @UseGuards(JwtAuthGuard)
  @Get(authEndpoints.gitlabGroups())
  async getGitlabGroups(@Req() req, @Res() res: Response) {
    const tokenPayload: TokenPayload = req.user;
    const gitlabClient = this.gitLabClientFactory(
      tokenPayload.gitProviderToken,
    );
    const groups = await gitlabClient.getUserGroups();
    const transformedGroups = mapGitLabGroups(groups);
    res.status(HttpStatus.OK).send(transformedGroups);
  }

  @UseGuards(JwtAuthGuard)
  @Post(authEndpoints.gitlabGroups())
  async chooseGitlabGroup(
    @Body() groupData: GitLabGroup,
    @Req() req,
    @Res() res: Response,
  ) {
    const tokenPayload: TokenPayload = req.user;
    const user = await this.userService.getUserByRegistrationChannelUserId(
      tokenPayload.gitProviderUserId,
    );
    await this.organizationService.update(tokenPayload.organizationId, {
      status: OrganizationStatus.Registered,
    });

    const gitProvider =
      await this.authService.findGitProviderByRepositoryCollectionId(
        groupData.name,
      );
    if (!gitProvider) {
      this.authService.createGitProvider({
        name: GitProviderName.GITLAB,
        repositoryCollectionId: groupData.name,
        organization: user.organization,
        metadata: groupData,
      });
    }

    const gitlabClient = this.gitLabClientFactory(
      tokenPayload.gitProviderToken,
    );

    const isBotAddedToGroup = await gitlabClient.isUserInGroup(groupData.id);

    if (!isBotAddedToGroup) {
      await gitlabClient.addUserToGroup(groupData.id);
    }

    res.status(HttpStatus.OK).send(groupData);
  }

  @Post(authEndpoints.refreshToken())
  async refresh(
    @Body('refreshToken') refreshToken: string,
    @Res() res: Response,
  ) {
    const payload = await this.authService.validateRefreshToken(refreshToken);
    if (!payload) {
      return res.status(HttpStatus.UNAUTHORIZED).send('Invalid refresh token');
    }

    const accessToken = await this.authService.generateAccessToken(payload);

    this.setTokensAsCookies(res, { accessToken });

    return res.status(HttpStatus.OK).send({ accessToken });
  }

  setTokensAsCookies(@Res() res, tokens: Tokens): void {
    if (tokens.accessToken) {
      res.cookie('c-at', tokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 15 * 60 * 1000, // 15 minutes
      });
    }

    if (tokens.refreshToken) {
      res.cookie('c-rt', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });
    }
  }
}
