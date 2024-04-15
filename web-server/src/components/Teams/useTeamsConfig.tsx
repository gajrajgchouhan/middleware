import { useSnackbar } from 'notistack';
import {
  createContext,
  useContext,
  useEffect,
  SyntheticEvent,
  useCallback
} from 'react';

import { Integration } from '@/constants/integrations';
import { useAuth } from '@/hooks/useAuth';
import { useBoolState, useEasyState } from '@/hooks/useEasyState';
import { fetchTeams, createTeam } from '@/slices/team';
import { useDispatch, useSelector } from '@/store';
import { DB_OrgRepo } from '@/types/api/org_repo';
import { Team } from '@/types/api/teams';
import { BaseRepo, RepoUniqueDetails } from '@/types/resources';
import { depFn } from '@/utils/fn';

interface TeamsCRUDContextType {
  orgRepos: BaseRepo[];
  teams: Team[];
  teamReposMaps: Record<string, DB_OrgRepo[]>;
  teamName: string;
  showTeamNameError: boolean;
  handleTeamNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  raiseTeamNameError: () => void;
  repoOptions: BaseRepo[];
  selectedRepos: BaseRepo[];
  handleRepoSelectionChange: (
    _: SyntheticEvent<Element, Event>,
    value: BaseRepo[]
  ) => void;
  teamRepoError: boolean;
  raiseTeamRepoError: () => void;
  onSave: (callBack?: AnyFunction) => void;
  isSaveLoading: boolean;
}

const TeamsCRUDContext = createContext<TeamsCRUDContextType | undefined>(
  undefined
);

export const useTeamCRUD = () => {
  const context = useContext(TeamsCRUDContext);
  if (!context) {
    throw new Error(
      'useTeamSettings must be used within a TeamsSettingsProvider'
    );
  }
  return context;
};

export const TeamsCRUDProvider: React.FC = ({ children }) => {
  // team slice logic
  const { enqueueSnackbar } = useSnackbar();
  const dispatch = useDispatch();
  const teamReposMaps = useSelector((s) => s.team.teamReposMaps);
  const teams = useSelector((s) => s.team.teams);
  const orgRepos = useSelector((s) => s.team.orgRepos);
  const { orgId, org } = useAuth();
  useEffect(() => {
    dispatch(
      fetchTeams({
        org_id: orgId,
        provider: Integration.GITHUB
      })
    );
  }, [dispatch, orgId]);

  // team name logic
  const teamName = useEasyState('');
  const teamNameError = useBoolState(false);
  const handleTeamNameChange = useCallback(
    (e: any) => {
      depFn(teamName.set, e.target.value);
    },
    [teamName.set]
  );
  const showTeamNameError = teamNameError.value;
  const raiseTeamNameError = useCallback(() => {
    if (!teamName.value) {
      depFn(teamNameError.true);
    } else {
      depFn(teamNameError.false);
    }
  }, [teamName.value, teamNameError.false, teamNameError.true]);

  // team-repo selection logic
  const selections = useEasyState<BaseRepo[]>([]);
  const repoOptions = orgRepos;
  const selectedRepos = selections.value;
  const handleRepoSelectionChange = useCallback(
    (_: SyntheticEvent<Element, Event>, value: BaseRepo[]) => {
      depFn(selections.set, value);
    },
    [selections.set]
  );
  const teamRepoError = useBoolState();
  const raiseTeamRepoError = useCallback(() => {
    if (!selections.value.length) {
      depFn(teamRepoError.true);
    } else {
      depFn(teamRepoError.false);
    }
  }, [selections.value.length, teamRepoError.false, teamRepoError.true]);

  // save team logic
  const isSaveLoading = useBoolState();
  const onSave = useCallback(
    (callBack?: AnyFunction) => {
      depFn(isSaveLoading.true);
      const repoPayload = {
        [org.name]: selections.value.map(
          (repo) =>
            ({
              idempotency_key: repo.id,
              name: repo.name,
              slug: repo.slug
            }) as RepoUniqueDetails
        )
      };
      dispatch(
        createTeam({
          org_id: orgId,
          team_name: teamName.value,
          org_repos: repoPayload,
          provider: Integration.GITHUB
        })
      )
        .then((res) => {
          callBack?.(res);
          dispatch(
            fetchTeams({
              org_id: orgId,
              provider: Integration.GITHUB
            })
          );
        })
        .catch((e) => {
          enqueueSnackbar('Failed to create team', {
            variant: 'error',
            autoHideDuration: 2000
          });
          console.error('Failed to create team', e);
        })
        .finally(isSaveLoading.false);
    },
    [
      dispatch,
      enqueueSnackbar,
      isSaveLoading.false,
      isSaveLoading.true,
      org.name,
      orgId,
      selections.value,
      teamName.value
    ]
  );

  const contextValue: TeamsCRUDContextType = {
    teamName: teamName.value,
    showTeamNameError,
    raiseTeamNameError,
    teamReposMaps,
    teams,
    orgRepos,
    handleTeamNameChange,
    repoOptions,
    selectedRepos,
    handleRepoSelectionChange,
    teamRepoError: teamRepoError.value,
    raiseTeamRepoError,
    onSave,
    isSaveLoading: isSaveLoading.value
  };

  return (
    <TeamsCRUDContext.Provider value={contextValue}>
      {children}
    </TeamsCRUDContext.Provider>
  );
};