// The plan list is a table on wide screens: the column header in PlanList and
// every PlanCard row share this grid so the columns line up.
// plan | est. bill | rate / kWh | term | renewable | details button
// Below 760px the "row" breakpoint is off and each row stacks (see index.css).
export const ROW_GRID =
  "row:grid-cols-[minmax(0,1fr)_92px_86px_70px_88px_40px] row:gap-[14px]";
