// SPDX-FileCopyrightText: 2026 LavCorps <lavcorps@protonmail.com>
//
// SPDX-License-Identifier: AGPL-3.0-or-later

/**
 * @privateRemarks
 * with any luck, this will never see the light of day.
 * to anyone looking at this code: just because you can use it does not mean you should.
 * 
 * without any rational tracking, the freakishly large floating point behavior largely just succeeds in hiding precision
 * failures, which will eventually cascade in `toBigInt()` failing on 1/3 + 1/3 + 1/3, which will cascade in `pow()`
 * throwing an error unless you are completely certain and correct that you have an exact integer as the exponent operand.
 * 
 * demons lurk in every corner of this code, and any sufficiently irrepresentable fraction will always and forever be displayed
 * in scientific notation, due to the brittle nature of magnitude calculation.
 * the sheer difference in precision between this class and the standard library doubles means that unless you utilize this class
 * for all arithmetic (bad idea!), you will end up with various inane cases such as comparing 1/3 in BigNum and 1/3 in number giving
 * unexpected results.
 * 
 * why did i write this all in my fork of Alter Ego?
 * i will apologize to Ms. VBLANK, if she ever sees this monstrosity.
 * - AC
 */

export default class BigNum {
    /** The mantissa of the BigNum. */
    readonly mantissa: bigint;

    /** The exponent of the BigNum. */
    readonly exponent: bigint;

    /** The sign of the BigNum. `false` is positive, `true` is negative. */
    readonly sign: boolean;

    /**
     * Creates a new BigNum.
     * @param mantissa - The mantissa (coefficient, significand). Defaults to `0`.
     * @param exponent - The exponent. Defaults to `0`.
     * @param sign - The sign. `false` is positive, `true` is negative. Defaults to `false`.
     */
    constructor(mantissa: bigint = 0n, exponent: bigint = 0n, sign: boolean = false) {
        this.mantissa = mantissa;
        this.exponent = exponent;
        this.sign = sign;
    }

    /**
     * Convert `operand` to a BigNum.
     * @param operand - The number of bigint to convert to a BigNum.
     * @returns A new BigNum representing the provided number or bigint.
     */
    static convert(operand: number | bigint): BigNum {
        if (typeof operand === "bigint") {
            // handle zero
            if (operand === 0n)
                return new BigNum(0n, 0n, false);

            // sign can easily be derived from whether or not the operand is less than zero
            const sign = operand < 0n;

            // initial mantissa is just the operand, conditionally negated to account for sign-splitting
            let mantissa = sign ? -operand : operand;
            // initial exponent is zero
            let exponent = 0n;

            // normalizing!
            while (mantissa > 0n && (mantissa & 1n) === 0n) {
                mantissa >>= 1n;
                exponent += 1n;
            }

            return new BigNum(mantissa, exponent, sign);
        } else {
            // handle non-finite numbers
            if (!Number.isFinite(operand))
                throw new RangeError(`Cannot convert ${operand} to BigNum! Only finite numbers can be converted to BigNum!`);
            // handle zero
            if (operand === 0)
                return new BigNum(0n, 0n, false);

            // construct the ArrayBuffer for retrieving bits of a number
            const buffer = new ArrayBuffer(8);
            // construct the DataView on that buffer
            const dataView = new DataView(buffer);
            // insert the operand into the view
            dataView.setFloat64(0, operand);

            // retrieve the bits representing the double-precision float from the DataView as uint64
            const bits = dataView.getBigUint64(0)

            // constant for the exponent mask of a 64-bit float (lowest 11 bits)
            const EXPONENT_MASK = 0b11111111111n;
            // constant for the fraction mask of a 64-bit float (lowest 52 bits)
            const FRACTION_MASK = 0b1111111111111111111111111111111111111111111111111111n;

            // shift the bits right by 63, and keep the lowest bit (0 = positive, 1 = negative)
            const signBit = (bits >> 63n) & 1n;
            // shift the bits right by 52, then mask off all but the lowest 11 bits
            const exponentBits = (bits >> 52n) & EXPONENT_MASK;
            // mask off all but the lowest 52 bits
            const fractionBits = bits & FRACTION_MASK;

            // mantissa definition
            let mantissa: bigint;
            // exponent definition
            let exponent: bigint;

            if (exponentBits === 0n) {
                // handle subnormal exponent bits
                mantissa = fractionBits;
                exponent = -1074n;
            } else {
                mantissa = (1n << 52n) | fractionBits;
                // 1023 is the IEEE 754 bias, which we must account for
                // the fraction has 52 bits to account for as well...
                exponent = exponentBits - 1023n - 52n;
            }

            // normalizing!
            while (mantissa > 0n && (mantissa & 1n) === 0n) {
                mantissa >>= 1n;
                exponent += 1n;
            }

            return new BigNum(mantissa, exponent, signBit === 1n)
        }
    }

    /**
     * Returns the sum of `a` and `b`.
     * @param a - The number, bigint, or BigNum to add to `b`.
     * @param b - The number, bigint, or BigNum to add to `a`.
     * @returns A new BigNum representing the sum of `a` and `b`.
     */
    static add(a: number | bigint | BigNum, b: number | bigint | BigNum): BigNum {
        if (!(a instanceof BigNum))
            a = BigNum.convert(a);
        if (!(b instanceof BigNum))
            b = BigNum.convert(b);

        if (a.mantissa === 0n)
            return b.clone();
        if (b.mantissa === 0n)
            return a.clone();

        let exp = a.exponent < b.exponent ? a.exponent : b.exponent;

        const aShift = a.exponent - exp;
        const bShift = b.exponent - exp;

        const aMantissa = a.mantissa << aShift;
        const bMantissa = b.mantissa << bShift;

        let mag: bigint;
        let sign: boolean;

        if (a.sign === b.sign) {
            mag = aMantissa + bMantissa;
            sign = a.sign;
        } else {
            if (aMantissa > bMantissa) {
                mag = aMantissa - bMantissa;
                sign = a.sign;
            } else if (bMantissa > aMantissa) {
                mag = bMantissa - aMantissa;
                sign = b.sign;
            } else {
                return new BigNum(0n, 0n, false);
            }
        }

        while (mag > 0n && (mag & 1n) === 0n) {
            mag >>= 1n;
            exp += 1n;
        }

        return new BigNum(mag, exp, sign);
    }

    /**
     * Returns the sum of this BigNum and `other`.
     * @param other - The number, bigint, or BigNum to add to this BigNum.
     * @returns A new BigNum representing the sum of this BigNum and `other`.
     */
    add(other: number | bigint | BigNum): BigNum {
        return BigNum.add(this, other);
    }

    /**
     * Returns the result of `a` minus `b`.
     * @param a - The number, bigint, or BigNum to be subtract from.
     * @param b - The number, bigint, or BigNum to subtract from `a`.
     * @returns A new BigNum representing the result of `a` minus `b`.
     */
    static subtract(a: number | bigint | BigNum, b: number | bigint | BigNum): BigNum {
        if (!(a instanceof BigNum))
            a = BigNum.convert(a);
        if (!(b instanceof BigNum))
            b = BigNum.convert(b);

        return BigNum.add(a, b.negate());
    }

    /**
     * Returns the result of this BigNum minus `other`.
     * @param other - The number, bigint, or BigNum to subtract from this BigNum.
     * @returns A new BigNum representing the subtraction `other` from this BigNum.
     */
    subtract(other: number | bigint | BigNum): BigNum {
        return BigNum.subtract(this, other);
    }

    /**
     * Returns the product of `a` and `b`.
     * @param a - The number, bigint, or BigNum to multiply to `b`.
     * @param b - The number, bigint, or BigNum to multiply to `a`.
     * @returns A new BigNum representing the product of `a` and `b`.
     */
    static multiply(a: number | bigint | BigNum, b: number | bigint | BigNum): BigNum {
        if (!(a instanceof BigNum))
            a = BigNum.convert(a);
        if (!(b instanceof BigNum))
            b = BigNum.convert(b);

        if (a.mantissa === 0n || b.mantissa === 0n)
            return new BigNum(0n, 0n, false);

        let mantissa = a.mantissa * b.mantissa;
        let exponent = a.exponent + b.exponent;
        const sign = a.sign !== b.sign;

        while (mantissa > 0n && (mantissa & 1n) === 0n) {
            mantissa >>= 1n;
            exponent += 1n;
        }

        return new BigNum(mantissa, exponent, sign);
    }

    /**
     * Returns the product of this BigNum and `other`.
     * @param other - The number, bigint, or BigNum to divide this BigNum by.
     * @returns A new BigNum representing the product of this BigNum and `other`.
     */
    multiply(other: number | bigint | BigNum): BigNum {
        return BigNum.multiply(this, other);
    }

    /**
     * Returns the quotient of `a` divided by `b`.
     * @param a - The number, bigint, or BigNum to serve as the numerator.
     * @param b - The number, bigint, or BigNum to serve as the denominator.
     * @returns A new BigNum representing the quotient of `a` divided by `b`.
     */
    static divide(a: number | bigint | BigNum, b: number | bigint | BigNum): BigNum {
        if (!(a instanceof BigNum))
            a = BigNum.convert(a);
        if (!(b instanceof BigNum))
            b = BigNum.convert(b);

        if (b.mantissa === 0n)
            throw new RangeError("Division by zero");

        if (a.mantissa === 0n)
            return new BigNum(0n, 0n, false);

        const sign = a.sign !== b.sign;

        let mantissa = 0n;
        // start with 64 bits of precision
        let precision = 64n;

        while (mantissa === 0n) {
            mantissa = (a.mantissa << precision) / b.mantissa;
            precision += 64n;
        }

        // rollback final precision increase for an accurate precision count
        precision -= 64n;

        let exponent = a.exponent - b.exponent - precision;

        while (mantissa > 0n && (mantissa & 1n) === 0n) {
            mantissa >>= 1n;
            exponent += 1n;
        }

        return new BigNum(mantissa, exponent, sign);
    }

    /**
     * Returns the quotient of this BigNum divided by `other`.
     * @param other - The number, bigint, or BigNum to multiply to this BigNum.
     * @returns A new BigNum representing the quotient of this BigNum and `other`.
     */
    divide(other: number | bigint | BigNum): BigNum {
        return BigNum.divide(this, other);
    }

    /**
     * Returns the BigNum of `operand` raised to the power of `exp`.
     * @param operand - The number, bigint, or BigNum to serve as the base.
     * @param exp - The number, bigint, or BigNum to serve as the exponent.
     * @returns A new BigNum representing `operand` raised to the power of `exp`.
     */
    static pow(operand: number | bigint | BigNum, exp: number | bigint | BigNum): BigNum {
        if (!(operand instanceof BigNum))
            operand = BigNum.convert(operand);
        if (!(exp instanceof BigNum))
            exp = BigNum.convert(exp);

        let exponent: bigint;
        try {
            exponent = exp.toBigInt();
        } catch {
            throw new Error(`Exponent must be exact integer, got ${exp.toString()}`);
        }

        if (operand.mantissa === 0n) {
            if (exponent === 0n)
                return new BigNum(1n, 0n, false);
            if (exponent < 0n)
                throw new RangeError("Division by zero (negative exponent with zero base)");
            return new BigNum(0n, 0n, false);
        }

        if (exponent === 0n)
            return new BigNum(1n, 0n, false);

        if (exponent === 1n)
            return operand.clone();

        const negativeExp = exponent < 0n;
        let absExp = negativeExp ? -exponent : exponent;

        let result = new BigNum(1n, 0n, false);
        let current = operand.clone();

        while (absExp > 0n) {
            if (absExp & 1n) {
                result = BigNum.multiply(result, current);
            }
            current = BigNum.multiply(current, current);
            absExp >>= 1n;
        }

        if (negativeExp) {
            result = BigNum.divide(1n, result);
        }

        return result;
    }

    /**
     * Returns this BigNum raised to the power of `exp`.
     * @param exp - The number, bigint, or BigNum to exponentiate this BigNum by.
     * @returns A new BigNum representing the result of this BigNum raised to the power of `exp`.
     */
    pow(exp: number | bigint | BigNum): BigNum {
        return BigNum.pow(this, exp);
    }

    /** Returns the negation of BigNum `operand`. */
    static negate(operand: number | bigint | BigNum): BigNum {
        if (!(operand instanceof BigNum))
            operand = BigNum.convert(operand);

        return new BigNum(operand.mantissa, operand.exponent, !operand.sign);
    }

    /** Returns the negation of this BigNum. */
    negate(): BigNum {
        return BigNum.negate(this);
    }

    /** Returns the absolute value of BigNum `operand`. */
    static abs(operand: number | bigint | BigNum): BigNum {
        if (!(operand instanceof BigNum))
            operand = BigNum.convert(operand);

        return new BigNum(operand.mantissa, operand.exponent, false);
    }

    /** Returns the absolute value of this BigNum. */
    abs(): BigNum {
        return BigNum.abs(this);
    }

    /**
     * Compares `a` with `b`.
     * @param a - The number, bigint, or BigNum to be compared against `b`.
     * @param b - The number, bigint, or BigNum to be compared against `a`.
     * @returns -1 if `a` < `b`, 0 if `a` = `b`, 1 if `a` > `b`.
     */
    static compare(a: number | bigint | BigNum, b: number | bigint | BigNum): -1 | 0 | 1 {
        if (!(a instanceof BigNum))
            a = BigNum.convert(a);
        if (!(b instanceof BigNum))
            b = BigNum.convert(b);

        if (a.mantissa === 0n && b.mantissa === 0n)
            return 0;
        if (a.sign !== b.sign)
            return a.sign ? -1 : 1;

        const minimumE = a.exponent < b.exponent ? a.exponent : b.exponent;
        const shiftA = a.exponent - minimumE;
        const shiftB = b.exponent - minimumE;
        const magA = a.mantissa << shiftA;
        const magB = b.mantissa << shiftB;

        let compResult: -1 | 1;
        if (magA === magB)
            return 0;
        else
            compResult = magA < magB ? -1 : 1;

        return a.sign ? -compResult as -1 | 1 : compResult;
    }

    /**
     * Compares this BigNum with `other`.
     * @param other - The number, bigint, or BigNum to compare this BigNum against.
     * @returns -1 if this BigNum < `other`, 0 if this BigNum = `other`, 1 if this BigNum > `other`.
     */
    compare(other: number | bigint | BigNum): -1 | 0 | 1 {
        return BigNum.compare(this, other);
    }

    /** Converts the BigNum `operand` to a string in scientific or decimal notation. BigNums smaller than 2^20 will be in decimal notation. */
    static toString(operand: number | bigint | BigNum): string {
        if (!(operand instanceof BigNum))
            operand = BigNum.convert(operand);
        if (operand.mantissa === 0n)
            return "0";
        const sign = operand.sign ? "-" : "";

        // check magnitude - we print decimal when smaller than 2^20
        let small = false;

        if (operand.exponent >= -15n && operand.exponent < 20n) {
            const shift = 20n - operand.exponent;
            const limit = 1n << shift;
            if (operand.mantissa < limit)
                small = true;
        }

        if (small)
            return `${sign}${BigNum.toDecimal(operand)}`;
        else
            return `${sign}${BigNum.toScientific(operand)}`;
    }

    /** Converts the BigNum `operand` to a string in decimal notation. */
    private static toDecimal(operand: BigNum): string {
        if (operand.exponent >= 0n)
            return (operand.mantissa << operand.exponent).toString();
        else {
            const shift = -operand.exponent;
            const factor = 5n ** shift;
            const scaled = operand.mantissa * factor;

            let str = scaled.toString();

            if (str.length <= shift)
                str = '0'.repeat(Number(shift - BigInt(str.length) + 1n)) + str;

            const whole = str.slice(0, Number(BigInt(str.length) - shift)) || '0';
            let frac = str.slice(Number(BigInt(str.length) - shift));
            frac = frac.replace(/0+$/, '');

            return frac ? whole + '.' + frac : whole;
        }
    }

    /** Converts the BigNum `operand` to a string in scientific notation. */
    private static toScientific(operand: BigNum): string {
        const logarithmMantissa = Math.log10(Number(operand.mantissa));
        const logarithmTwo = Math.log10(2);
        let logarithmValue = logarithmMantissa + Number(operand.exponent) * logarithmTwo;
        let floorValue = Math.floor(logarithmValue);

        let mantissa = Math.pow(10, logarithmValue - floorValue);
        
        if (mantissa >= 10) {
            mantissa /= 10;
            floorValue += 1;
        } else if (mantissa < 1) {
            mantissa *= 10;
            floorValue -= 1;
        }

        let strMantissa = mantissa.toFixed(14);
        strMantissa = strMantissa.replace(/\.?0+$/, '');

        const strExponent = floorValue >= 0 ? `+${floorValue}` : floorValue;

        return strMantissa + 'e' + strExponent;
    }

    /** Converts this BigNum to a string in scientific or decimal notation. */
    toString(): string {
        return BigNum.toString(this);
    }

    /** Converts the BigNum `operand` to a double-precision float. */
    static toNumber(operand: number | bigint | BigNum): number {
        if (!(operand instanceof BigNum))
            operand = BigNum.convert(operand);

        if (operand.mantissa === 0n) return 0;
        const output = Number(operand.mantissa) * Math.pow(2, Number(operand.exponent));
        return operand.sign ? -output : output;
    }

    /** Converts this BigNum to a double-precision float. */
    toNumber(): number {
        return BigNum.toNumber(this);
    }

    /** Converts the BigNum `operand` to a string in scientific or decimal notation. */
    static toBigInt(operand: number | bigint | BigNum): bigint {
        if (!(operand instanceof BigNum))
            operand = BigNum.convert(operand);
        if (operand.exponent < 0n)
            throw new RangeError(`Cannot convert ${operand.toString()} to bigint! Only whole numbers numbers can be converted to bigint!`);
        const output = operand.mantissa << operand.exponent;
        return operand.sign ? -output : output;
    }

    /** Converts this BigNum to a string in scientific or decimal notation. */
    toBigInt(): bigint {
        return BigNum.toBigInt(this);
    }

    /** Returns a deep copy of the BigNum `operand`. */
    static clone(operand: BigNum): BigNum {
        return new BigNum(operand.mantissa, operand.exponent, operand.sign);
    }

    /** Returns a deep copy of this BigNum. */
    clone(): BigNum {
        return BigNum.clone(this);
    }
}
