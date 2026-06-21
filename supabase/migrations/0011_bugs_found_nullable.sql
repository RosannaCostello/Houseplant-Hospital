-- bugs_found: null = not yet assessed, true = yes, false = no
alter table plants
  alter column bugs_found drop not null,
  alter column bugs_found drop default;

alter table plants
  alter column bugs_found set default null;

-- Previous default false was never an explicit staff choice
update plants
set bugs_found = null
where bugs_found = false;
