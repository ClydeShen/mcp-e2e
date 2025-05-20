import type { Theme as MuiTheme, SxProps } from '@mui/material/styles';

/**
 * Merges a default SxProps with incoming SxProps.
 * The incoming SxProps can be an object, a function, or an array of these.
 * The default SxProps is always added first if provided.
 */
export const mergeSxProps = (
  defaultSx: SxProps<MuiTheme>,
  incomingSx?: SxProps<MuiTheme>
): SxProps<MuiTheme> => {
  // Helper to safely add an item to the sxArray
  const addItemToSxArray = (
    item: any,
    arr: Array<
      Exclude<
        SxProps<MuiTheme>,
        ReadonlyArray<any> | boolean | null | undefined
      >
    >
  ) => {
    if (item && (typeof item === 'object' || typeof item === 'function')) {
      arr.push(
        item as Exclude<
          SxProps<MuiTheme>,
          ReadonlyArray<any> | boolean | null | undefined
        >
      );
    }
  };

  const sxArray: Array<
    Exclude<SxProps<MuiTheme>, ReadonlyArray<any> | boolean | null | undefined>
  > = [];

  // Add defaultSx first
  if (Array.isArray(defaultSx)) {
    defaultSx.forEach((item) => addItemToSxArray(item, sxArray));
  } else {
    addItemToSxArray(defaultSx, sxArray);
  }

  // Then add incomingSx if it exists
  if (incomingSx) {
    if (Array.isArray(incomingSx)) {
      incomingSx.forEach((item) => addItemToSxArray(item, sxArray));
    } else {
      addItemToSxArray(incomingSx, sxArray);
    }
  }

  // If only one item (and it's not an array forced by defaultSx being an array initially),
  // return it directly. Otherwise, return the array.
  // This matches MUI's behavior where a single sx object/function is preferred over a single-element array.
  // However, if the defaultSx was an array, we should preserve the array structure even if incomingSx is undefined.
  if (
    sxArray.length === 1 &&
    !Array.isArray(defaultSx) &&
    (incomingSx === undefined || !Array.isArray(incomingSx))
  ) {
    return sxArray[0];
  }

  // Return an empty object if the array is empty, otherwise return the array.
  // This ensures a valid SxProps value is always returned.
  return sxArray.length > 0 ? sxArray : {};
};
