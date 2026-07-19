const toNonNegativeNumber = (value) => {
    const nextValue = Number(value);
    return Number.isFinite(nextValue) && nextValue >= 0 ? nextValue : null;
};

export const enforceSingleDefaultColorOption = (colorOptions = []) => {
    if (!Array.isArray(colorOptions)) {
        return [];
    }

    let defaultSelected = false;

    return colorOptions.map((option) => {
        const isDefault = Boolean(option?.isDefault);

        if (!isDefault || defaultSelected) {
            return {
                ...(option || {}),
                isDefault: false,
            };
        }

        defaultSelected = true;

        return {
            ...(option || {}),
            isDefault: true,
        };
    });
};

export const hasDefaultColorOption = (colorOptions = []) => {
    if (!Array.isArray(colorOptions)) {
        return false;
    }

    return colorOptions.some((option) => Boolean(option?.isDefault));
};

export const getDefaultColorPrice = (colorOptions = []) => {
    if (!Array.isArray(colorOptions)) {
        return null;
    }

    const defaultOption = colorOptions.find((option) => Boolean(option?.isDefault));
    return toNonNegativeNumber(defaultOption?.price);
};

export const syncProductPriceWithDefaultColor = (form, colorOptions = []) => {
    const defaultPrice = getDefaultColorPrice(colorOptions);

    if (defaultPrice == null) {
        return false;
    }

    const currentPrice = toNonNegativeNumber(form.getFieldValue('price'));
    if (currentPrice !== defaultPrice) {
        form.setFieldValue('price', defaultPrice);
    }

    return true;
};

export const buildColorOptionsAfterToggleDefault = (colorOptions = [], targetIndex, checked) => {
    if (!Array.isArray(colorOptions)) {
        return [];
    }

    return colorOptions.map((item, index) => ({
        ...(item || {}),
        isDefault: checked ? index === targetIndex : false,
    }));
};

export const buildColorOptionsAfterRemove = (colorOptions = [], targetIndex) => {
    if (!Array.isArray(colorOptions)) {
        return [];
    }

    const removedItem = colorOptions[targetIndex];
    const removedWasDefault = Boolean(removedItem?.isDefault);

    const remainingColorOptions = colorOptions
        .filter((_, index) => index !== targetIndex)
        .map((item) => ({
            ...(item || {}),
            isDefault: Boolean(item?.isDefault),
        }));

    const normalizedRemaining = enforceSingleDefaultColorOption(remainingColorOptions);

    if (!removedWasDefault || normalizedRemaining.length === 0) {
        return normalizedRemaining;
    }

    if (normalizedRemaining.some((item) => item?.isDefault)) {
        return normalizedRemaining;
    }

    return normalizedRemaining.map((item, index) => ({
        ...item,
        isDefault: index === 0,
    }));
};