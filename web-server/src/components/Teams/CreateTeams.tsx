import { Close } from '@mui/icons-material';
import {
  Autocomplete,
  Button,
  Card,
  CircularProgress,
  Divider,
  TextField,
  Tooltip
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { FC } from 'react';

import {
  useTeamCRUD,
  TeamsCRUDProvider
} from '@/components/Teams/useTeamsConfig';
import { useEasyState } from '@/hooks/useEasyState';
import { BaseRepo } from '@/types/resources';

import { FlexBox } from '../FlexBox';
import { Line } from '../Text';

export type CRUDProps = {
  onSave?: AnyFunction;
  onDiscard?: AnyFunction;
  teamId?: ID;
  hideCardComponents?: boolean;
};

const MAX_LENGTH_REPO_NAME = 25;

export const CreateEditTeams: FC<CRUDProps> = ({
  onSave,
  onDiscard,
  teamId,
  hideCardComponents
}) => {
  return (
    <TeamsCRUDProvider teamId={teamId}>
      <TeamsCRUD
        hideCardComponents={hideCardComponents}
        teamId={teamId}
        onDiscard={onDiscard}
        onSave={onSave}
      />
    </TeamsCRUDProvider>
  );
};

const TeamsCRUD: FC<CRUDProps> = ({
  onSave,
  onDiscard,
  hideCardComponents
}) => {
  const { isPageLoading, editingTeam, isEditing } = useTeamCRUD();
  return (
    <>
      {isPageLoading ? (
        <Loader />
      ) : (
        <FlexBox
          gap={4}
          col
          justifyBetween
          component={!hideCardComponents && Card}
          p={2}
          width={'900px'}
        >
          {isEditing && !editingTeam?.name ? (
            <FlexBox>No team selected</FlexBox>
          ) : (
            <>
              <Heading />
              <TeamName />
              <TeamRepos hideCardComponents={hideCardComponents} />
              <ActionTray onDiscard={onDiscard} onSave={onSave} />
            </>
          )}
        </FlexBox>
      )}
    </>
  );
};

export const Loader = () => {
  return (
    <FlexBox alignCenter gap2>
      <CircularProgress size="20px" />
      <Line>Loading...</Line>
    </FlexBox>
  );
};

const Heading = () => {
  const { isEditing, editingTeam } = useTeamCRUD();
  const heading = isEditing ? 'Edit a team' : 'Create a team';

  return (
    <FlexBox col>
      <Line huge semibold>
        {heading}
      </Line>
      {isEditing ? (
        <Line>
          Currently editing{' '}
          <Line info semibold>
            {editingTeam?.name}
          </Line>{' '}
        </Line>
      ) : (
        <Line>Create a team to generate metric insights</Line>
      )}
    </FlexBox>
  );
};

const TeamName = () => {
  const {
    teamName,
    handleTeamNameChange,
    showTeamNameError,
    raiseTeamNameError
  } = useTeamCRUD();

  return (
    <FlexBox col gap={2} relative>
      <FlexBox col>
        <Line big semibold>
          Team Name
        </Line>
        <Line>Choose a name for your team</Line>
      </FlexBox>

      <FlexBox>
        <TextField
          value={teamName}
          onChange={handleTeamNameChange}
          placeholder="Enter team name"
          error={showTeamNameError}
          sx={{ width: '260px', minWidth: '260px' }}
          onBlur={raiseTeamNameError}
          autoComplete="off"
        />
      </FlexBox>
    </FlexBox>
  );
};

const TeamRepos: FC<{ hideCardComponents?: boolean }> = ({
  hideCardComponents
}) => {
  const {
    repoOptions,
    teamRepoError,
    handleRepoSelectionChange,
    selectedRepos,
    raiseTeamRepoError,
    loadingRepos,
    handleReposSearch
  } = useTeamCRUD();

  const searchQuery = useEasyState('');

  return (
    <FlexBox col gap={2}>
      <FlexBox col>
        <Line big semibold>
          Add Repositories
        </Line>
        <Line>Select repositories for this team</Line>
      </FlexBox>
      <FlexBox>
        <Autocomplete
          noOptionsText={
            !searchQuery.value
              ? 'Start typing to search...'
              : 'No repositories found'
          }
          loading={loadingRepos}
          loadingText="Loading repos..."
          onBlur={raiseTeamRepoError}
          disableCloseOnSelect
          disableClearable
          sx={{ width: '260px', height: '48px', minWidth: '260px' }}
          multiple
          options={repoOptions}
          value={selectedRepos}
          onChange={handleRepoSelectionChange}
          getOptionLabel={(option) => `${option.parent}/${option.name}`}
          renderInput={(params) => (
            <TextField
              onChange={(e) => {
                handleReposSearch(e as React.ChangeEvent<HTMLInputElement>);
                searchQuery.set(e.target.value);
              }}
              {...params}
              label={
                selectedRepos.length
                  ? `${selectedRepos.length} selected`
                  : `Search repositories`
              }
              error={teamRepoError}
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {loadingRepos ? (
                      <CircularProgress color="inherit" size={20} />
                    ) : null}
                    {params.InputProps.endAdornment}
                  </>
                )
              }}
            />
          )}
          renderOption={(props, option, { selected }) => (
            <li {...props}>
              <FlexBox
                gap={2}
                justifyBetween
                fullWidth
                sx={{
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden'
                }}
              >
                <FlexBox col sx={{ maxWidth: '200px', overflow: 'hidden' }}>
                  {option.parent && <Line tiny>{option.parent}</Line>}

                  {option.name.length > MAX_LENGTH_REPO_NAME ? (
                    <Tooltip title={option.name}>
                      <Line>{`${option.name.substring(
                        0,
                        MAX_LENGTH_REPO_NAME
                      )}...`}</Line>
                    </Tooltip>
                  ) : (
                    <Line>{option.name}</Line>
                  )}
                </FlexBox>
                {selected ? <Close fontSize="small" /> : null}
              </FlexBox>
            </li>
          )}
          renderTags={() => null}
        />
        <DisplayRepos hideCardComponents={hideCardComponents} />
      </FlexBox>
    </FlexBox>
  );
};

const ActionTray: FC<CRUDProps> = ({
  onSave: onSaveCallBack,
  onDiscard: onDiscardCallBack
}) => {
  const {
    onSave,
    isSaveLoading,
    teamName,
    selectedRepos,
    onDiscard,
    saveDisabled
  } = useTeamCRUD();
  const { enqueueSnackbar } = useSnackbar();

  return (
    <FlexBox gap2>
      <FlexBox
        onClick={() => {
          if (!teamName) {
            return enqueueSnackbar('Please enter a team name', {
              variant: 'error',
              autoHideDuration: 2000
            });
          }
          if (!selectedRepos.length) {
            return enqueueSnackbar('Please select at least one repository', {
              variant: 'error',
              autoHideDuration: 2000
            });
          }
        }}
      >
        <Button
          disabled={saveDisabled}
          variant="contained"
          onClick={() => onSave(onSaveCallBack)}
          sx={{
            minWidth: '200px',
            '&.Mui-disabled': {
              borderColor: 'secondary.light'
            }
          }}
        >
          {isSaveLoading ? <CircularProgress size={'18px'} /> : 'Save'}
        </Button>
      </FlexBox>
      <Button
        variant="outlined"
        sx={{ minWidth: '200px' }}
        disabled={isSaveLoading}
        onClick={() => {
          onDiscard(onDiscardCallBack);
        }}
      >
        Discard
      </Button>
    </FlexBox>
  );
};

const DisplayRepos: FC<{ hideCardComponents?: boolean }> = ({
  hideCardComponents
}) => {
  const { selectedRepos } = useTeamCRUD();
  return (
    <FlexBox gap2 ml={2} minHeight={hideCardComponents ? '54px' : '49px'}>
      {!!selectedRepos.length && <Divider flexItem orientation="vertical" />}
      <FlexBox flexWrap={'wrap'} gap2>
        {selectedRepos.map((repo) => (
          <RepoItem
            hideCardComponents={hideCardComponents}
            repo={repo}
            key={repo.id}
          />
        ))}
      </FlexBox>
    </FlexBox>
  );
};

const RepoItem: FC<{ repo: BaseRepo; hideCardComponents?: boolean }> = ({
  repo,
  hideCardComponents
}) => {
  const { unselectRepo } = useTeamCRUD();
  return (
    <FlexBox
      height={hideCardComponents ? '54px' : '49px'}
      border={hideCardComponents && '1px solid'}
      borderColor={hideCardComponents && '#353552'}
      borderRadius={'10px'}
      component={!hideCardComponents && Card}
      gap={2}
      alignCenter
      px={2}
    >
      {repo.name}{' '}
      <FlexBox
        pointer
        onClick={() => {
          unselectRepo(repo.id);
        }}
        title="Remove repo"
        sx={{
          '&:hover': {
            filter: 'brightness(0.7)'
          },
          transition: 'filter 0.2s'
        }}
      >
        <Close fontSize="small" />
      </FlexBox>
    </FlexBox>
  );
};
